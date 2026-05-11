import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Cart, Product, PromoCode } from "@/lib/models";
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

    const cart = await Cart.findOne({ userId: user.id }).lean();
    if (!cart) {
      return NextResponse.json({ items: [], subtotal: 0, total: 0, discountAmount: 0 });
    }

    const refreshedItems = [];
    const isDealer = user.customerType === "dealer";
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

    const totals = await calculateServerSideCart(refreshedItems, cart.promoCode);

    // Apply flat discounts to item prices for UI consistency ONLY if thresholds are met
    for (const item of refreshedItems) {
      const pId = item.productId || item.id;
      const applicableFlat = flatDiscounts.find(d => 
        d.allProducts || (d.applicableProducts && d.applicableProducts.some((id: any) => id.toString() === pId))
      );
      
      if (applicableFlat) {
        const minOrder = Number(applicableFlat.minOrderAmount || 0);
        if (totals.subtotal >= minOrder) {
          const amount = Number(applicableFlat.discountAmount || 0);
          const basePrice = Number(item.price);
          if (applicableFlat.discountType === 'percentage') {
            item.price = basePrice - (basePrice * amount) / 100;
          } else {
            item.price = Math.max(0, basePrice - amount);
          }
        }
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
    const isDealer = user.customerType === "dealer";
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

    const totals = await calculateServerSideCart(refreshedItems, promoCode);

    // Update item prices for display ONLY if thresholds are met
    for (const item of refreshedItems) {
      const pId = item.productId || item.id;
      const applicableFlat = flatDiscounts.find(d => 
        d.allProducts || (d.applicableProducts && d.applicableProducts.some((id: any) => id.toString() === pId))
      );
      
      if (applicableFlat) {
        const minOrder = Number(applicableFlat.minOrderAmount || 0);
        // Only override price for display if the threshold is met
        if (totals.subtotal >= minOrder) {
          const amount = Number(applicableFlat.discountAmount || 0);
          const basePrice = Number(item.price);
          if (applicableFlat.discountType === 'percentage') {
            item.price = basePrice - (basePrice * amount) / 100;
          } else {
            item.price = Math.max(0, basePrice - amount);
          }
        }
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
