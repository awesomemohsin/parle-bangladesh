import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Cart, Product, PromoCode, User } from "@/lib/models";
import { getEffectiveUserContext } from "@/lib/api-auth";
import { calculateServerSideCart } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const context = await getEffectiveUserContext(request);
    const user = context?.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isDealer = !!(
      ['super_admin', 'admin', 'moderator', 'owner'].includes(user.role) ||
      ['super_admin', 'admin', 'moderator', 'owner', 'dealer', 'employee'].includes(user.customerType)
    );
    const isRetailer = user.role === "customer" && user.customerType === "retailer";

    const cart = await Cart.findOne({ userId: user.id }).lean();
    if (!cart) {
      return NextResponse.json({ items: [], subtotal: 0, total: 0, discountAmount: 0 });
    }

    const refreshedItems = [];
    const flatDiscounts = await PromoCode.find({ type: 'flat', isActive: true }).lean();

    const productIds = (cart.items || []).map((item: any) => item.productId).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    for (const item of (cart.items || [])) {
      try {
        const product = productMap.get(item.productId);
        if (product) {
          const productIdStr = product._id?.toString();
          const applicableFlat = flatDiscounts.find(d => 
            d.allProducts || (d.applicableProducts && d.applicableProducts.some((id: any) => id.toString() === productIdStr))
          );

          const variation = product.variations.find((v: any) => {
            const weightMatch = (!item.weight && !v.weight) || (item.weight === v.weight);
            const flavorMatch = (!item.flavor && !v.flavor) || (item.flavor === v.flavor);
            return weightMatch && flavorMatch;
          });

          if (variation) {
            item.price = isDealer && variation.dealerPrice 
              ? variation.dealerPrice 
              : (isRetailer && variation.retailerPrice ? variation.retailerPrice : variation.price);
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
    const userDiscount = (user.flatDiscountPercent && user.flatDiscountExpiresAt && new Date(user.flatDiscountExpiresAt) > now)
      ? { percent: user.flatDiscountPercent, expiresAt: new Date(user.flatDiscountExpiresAt) }
      : undefined;

    const customerType = user.customerType || user.role;
    const totals = await calculateServerSideCart(refreshedItems, cart.promoCode, userDiscount, customerType);

    return NextResponse.json({
      items: refreshedItems,
      ...totals,
      flatRules: flatDiscounts
    });
  } catch (error: any) {
    console.error("Cart GET err:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const context = await getEffectiveUserContext(request);
    const user = context?.user;

    const { items, promoCode } = await request.json();

    if (!items || items.length === 0) {
      if (user) {
        await Cart.deleteOne({ userId: user.id });
      }
      return NextResponse.json({ success: true, items: [], subtotal: 0, total: 0, discountAmount: 0 });
    }

    const refreshedItems = [];
    let isDealer = !!(user && (
      ['super_admin', 'admin', 'moderator', 'owner'].includes(user.role) ||
      ['super_admin', 'admin', 'moderator', 'owner', 'dealer', 'employee'].includes(user.customerType)
    ));
    let isRetailer = user && user.role === "customer" && user.customerType === "retailer";
    let userDiscount = undefined;
    let customerType = user ? (user.customerType || user.role) : "customer";
      
    if (user) {
      const now = new Date();
      if (user.flatDiscountPercent && user.flatDiscountExpiresAt && new Date(user.flatDiscountExpiresAt) > now) {
        userDiscount = { percent: user.flatDiscountPercent, expiresAt: new Date(user.flatDiscountExpiresAt) };
      }
    }

    const flatDiscounts = await PromoCode.find({ type: 'flat', isActive: true }).lean();
    
    const productIds = items.map((item: any) => item.productId || item.id).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    for (const item of items) {
      const pId = (item.productId || item.id)?.toString();
      const product = productMap.get(pId);
      if (product) {
        const productIdStr = product._id?.toString();
        const applicableFlat = flatDiscounts.find(d => 
          d.allProducts || (d.applicableProducts && d.applicableProducts.some((id: any) => id.toString() === productIdStr))
        );

        const variation = product.variations.find((v: any) => {
          const weightMatch = (!item.weight && !v.weight) || (item.weight === v.weight);
          const flavorMatch = (!item.flavor && !v.flavor) || (item.flavor === v.flavor);
          return weightMatch && flavorMatch;
        });

        if (variation) {
          item.price = isDealer && variation.dealerPrice 
            ? variation.dealerPrice 
            : (isRetailer && variation.retailerPrice ? variation.retailerPrice : variation.price);
          item.variationDiscountPrice = variation.discountPrice;
          item.stock = variation.stock;
        }
      }
      refreshedItems.push(item);
    }

    const totals = await calculateServerSideCart(refreshedItems, promoCode, userDiscount, customerType);

    if (user) {
      await Cart.findOneAndUpdate(
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
    }

    return NextResponse.json({
      success: true,
      items: refreshedItems,
      ...totals,
      flatRules: flatDiscounts
    });
  } catch (error: any) {
    console.error("Cart POST err:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
