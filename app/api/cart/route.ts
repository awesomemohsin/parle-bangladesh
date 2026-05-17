import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Cart, Product, PromoCode, User } from "@/lib/models";
import { getVerifiedAuthUser } from "@/lib/api-auth";
import { calculateServerSideCart } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getVerifiedAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await User.findById(user.id).select("customerType flatDiscountPercent flatDiscountExpiresAt").lean() as any;
    const isDealer = dbUser?.customerType === "dealer";

    const cart = await Cart.findOne({ userId: user.id }).lean();
    if (!cart) {
      return NextResponse.json({ items: [], subtotal: 0, total: 0, discountAmount: 0 });
    }

    const refreshedItems = [];
    const flatDiscounts = await PromoCode.find({ type: 'flat', isActive: true }).lean();

    for (const item of (cart.items || [])) {
      try {
        const product = await Product.findById(item.productId).lean() as any;
        if (product) {
          const productIdStr = product._id?.toString();
          // Find if any flat discount applies to this product (regardless of minOrder for now)
          const applicableFlat = flatDiscounts.find(d => 
            d.allProducts || (d.applicableProducts && d.applicableProducts.some((id: any) => id.toString() === productIdStr))
          );

          const variation = product.variations.find((v: any) => {
            const weightMatch = (!item.weight && !v.weight) || (item.weight === v.weight);
            const flavorMatch = (!item.flavor && !v.flavor) || (item.flavor === v.flavor);
            return weightMatch && flavorMatch;
          });

          if (variation) {
            item.price = isDealer && variation.dealerPrice ? variation.dealerPrice : variation.price;
            item.variationDiscountPrice = variation.discountPrice;
            item.stock = variation.stock;
          }
        }
        refreshedItems.push(item);
      } catch (err) {
        refreshedItems.push(item);
      }
    }
    const now = new Date();
    const userDiscount = (dbUser && dbUser.flatDiscountPercent && dbUser.flatDiscountExpiresAt && new Date(dbUser.flatDiscountExpiresAt) > now)
      ? { percent: dbUser.flatDiscountPercent, expiresAt: new Date(dbUser.flatDiscountExpiresAt) }
      : undefined;

    const totals = await calculateServerSideCart(refreshedItems, cart.promoCode, userDiscount);

    // Apply flat discounts to item prices for UI consistency ONLY if thresholds are met
    for (const item of refreshedItems) {
      const pId = item.productId || item.id;
      const basePrice = Number(item.price);

      // A. Account flat discount candidate
      let bestDiscountedPrice = basePrice;
      let bestSavings = 0;
      let hasAnyDiscount = false;

      if (userDiscount && userDiscount.percent > 0) {
        bestSavings = (basePrice * userDiscount.percent) / 100;
        bestDiscountedPrice = basePrice - bestSavings;
        hasAnyDiscount = true;
      }

      // B. Global flat discount candidate
      const applicableFlat = flatDiscounts.find(d => 
        d.allProducts || (d.applicableProducts && d.applicableProducts.some((id: any) => id.toString() === pId))
      );
      
      if (applicableFlat) {
        const minOrder = Number(applicableFlat.minOrderAmount || 0);
        const maxCap = Number(applicableFlat.maxDiscountAmount || 0);
        if (totals.subtotal >= minOrder && maxCap <= 0) {
          const amount = Number(applicableFlat.discountAmount || 0);
          let currentDiscounted = basePrice;
          let currentSavings = 0;

          if (applicableFlat.discountType === 'percentage') {
            currentSavings = (basePrice * amount) / 100;
            currentDiscounted = basePrice - currentSavings;
          } else {
            currentSavings = amount;
            currentDiscounted = Math.max(0, basePrice - amount);
          }

          if (currentSavings > bestSavings) {
            bestSavings = currentSavings;
            bestDiscountedPrice = currentDiscounted;
            hasAnyDiscount = true;
          }
        }
      }

      if (hasAnyDiscount) {
        item.price = Math.round(bestDiscountedPrice);
      }
    }

    return NextResponse.json({
      items: refreshedItems,
      ...totals
    });
  } catch (error: any) {
    console.error("Cart GET err:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getVerifiedAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { items, promoCode } = await request.json();

    if (!items || items.length === 0) {
      await Cart.deleteOne({ userId: user.id });
      return NextResponse.json({ success: true, items: [], subtotal: 0, total: 0, discountAmount: 0 });
    }

    const refreshedItems = [];
    const dbUser = await User.findById(user.id).select("customerType flatDiscountPercent flatDiscountExpiresAt").lean() as any;
    const isDealer = dbUser?.customerType === "dealer";
    const flatDiscounts = await PromoCode.find({ type: 'flat', isActive: true }).lean();
    
    for (const item of items) {
      const pId = item.productId || item.id;
      const product = await Product.findById(pId).lean() as any;
      if (product) {
        const productIdStr = product._id?.toString();
        // Find if any flat discount applies to this product (regardless of minOrder for now, 
        // calculateServerSideCart will check minOrder)
        const applicableFlat = flatDiscounts.find(d => 
          d.allProducts || (d.applicableProducts && d.applicableProducts.some((id: any) => id.toString() === productIdStr))
        );

        const variation = product.variations.find((v: any) => {
          const weightMatch = (!item.weight && !v.weight) || (item.weight === v.weight);
          const flavorMatch = (!item.flavor && !v.flavor) || (item.flavor === v.flavor);
          return weightMatch && flavorMatch;
        });

        if (variation) {
          item.price = isDealer && variation.dealerPrice ? variation.dealerPrice : variation.price;
          item.variationDiscountPrice = variation.discountPrice;
          item.stock = variation.stock;
        }
      }
      refreshedItems.push(item);
    }

    const now = new Date();
    const userDiscount = (dbUser && dbUser.flatDiscountPercent && dbUser.flatDiscountExpiresAt && new Date(dbUser.flatDiscountExpiresAt) > now)
      ? { percent: dbUser.flatDiscountPercent, expiresAt: new Date(dbUser.flatDiscountExpiresAt) }
      : undefined;

    const totals = await calculateServerSideCart(refreshedItems, promoCode, userDiscount);

    // Update item prices for display ONLY if thresholds are met
    for (const item of refreshedItems) {
      const pId = item.productId || item.id;
      const basePrice = Number(item.price);

      // A. Account flat discount candidate
      let bestDiscountedPrice = basePrice;
      let bestSavings = 0;
      let hasAnyDiscount = false;

      if (userDiscount && userDiscount.percent > 0) {
        bestSavings = (basePrice * userDiscount.percent) / 100;
        bestDiscountedPrice = basePrice - bestSavings;
        hasAnyDiscount = true;
      }

      // B. Global flat discount candidate
      const applicableFlat = flatDiscounts.find(d => 
        d.allProducts || (d.applicableProducts && d.applicableProducts.some((id: any) => id.toString() === pId))
      );
      
      if (applicableFlat) {
        const minOrder = Number(applicableFlat.minOrderAmount || 0);
        const maxCap = Number(applicableFlat.maxDiscountAmount || 0);
        // Only override price for display if the threshold is met AND there is NO max cap
        // (Capped discounts are shown at the bottom to avoid confusion)
        if (totals.subtotal >= minOrder && maxCap <= 0) {
          const amount = Number(applicableFlat.discountAmount || 0);
          let currentDiscounted = basePrice;
          let currentSavings = 0;

          if (applicableFlat.discountType === 'percentage') {
            currentSavings = (basePrice * amount) / 100;
            currentDiscounted = basePrice - currentSavings;
          } else {
            currentSavings = amount;
            currentDiscounted = Math.max(0, basePrice - amount);
          }

          if (currentSavings > bestSavings) {
            bestSavings = currentSavings;
            bestDiscountedPrice = currentDiscounted;
            hasAnyDiscount = true;
          }
        }
      }

      if (hasAnyDiscount) {
        item.price = Math.round(bestDiscountedPrice);
      }
    }

    const cart = await Cart.findOneAndUpdate(
      { userId: user.id },
      {
        $set: {
          items: refreshedItems,
          promoCode: totals.promoCode,
          discountAmount: totals.discountAmount,
          promoDetails: totals.promoDetails,
          updatedAt: new Date()
        }
      },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );


    return NextResponse.json({
      success: true,
      items: refreshedItems,
      ...totals
    });
  } catch (error: any) {
    console.error("Cart POST err:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
