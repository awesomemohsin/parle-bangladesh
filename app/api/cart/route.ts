import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Cart, Product } from "@/lib/models";
import { getVerifiedAuthUser } from "@/lib/api-auth";

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
      return NextResponse.json({ items: [] });
    }

    // REFRESH PRICES BASED ON CURRENT ROLE
    const items = [];
    const isDealer = user.customerType === "dealer";

    for (const item of (cart.items || [])) {
      try {
        const product = await Product.findById(item.productId).lean() as any;
        if (product) {
          const variation = product.variations.find((v: any) => {
            const weightMatch = (!item.weight && !v.weight) || (item.weight === v.weight);
            const flavorMatch = (!item.flavor && !v.flavor) || (item.flavor === v.flavor);
            return weightMatch && flavorMatch;
          });

          if (variation) {
            let currentPrice = variation.price;
            if (isDealer && variation.dealerPrice) {
              currentPrice = variation.dealerPrice;
            } else if (variation.discountPrice && variation.discountPrice > 0) {
              currentPrice = variation.discountPrice;
            }
            
            items.push({
              ...item,
              price: currentPrice,
              stock: variation.stock
            });
            continue;
          }
        }
        items.push(item);
      } catch (err) {
        items.push(item);
      }
    }

    return NextResponse.json({ 
      items,
      promoCode: cart.promoCode,
      discountAmount: cart.discountAmount
    });
  } catch (error: any) {
    console.error("Cart GET err:", error);
    return NextResponse.json({ error: "Internal server error: " + (error.message || "Unknown error") }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getVerifiedAuthUser(request);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { items, promoCode, discountAmount } = await request.json();

    if (!items || items.length === 0) {
      await Cart.deleteOne({ userId: user.id });
      return NextResponse.json({ success: true, items: [] });
    }

    const cart = await Cart.findOneAndUpdate(
      { userId: user.id },
      { 
        $set: { 
          items,
          promoCode,
          discountAmount,
          updatedAt: new Date()
        } 
      },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );

    return NextResponse.json({ 
      success: true, 
      items: cart.items,
      promoCode: cart.promoCode,
      discountAmount: cart.discountAmount
    });
  } catch (error: any) {
    console.error("Cart POST err:", error);
    return NextResponse.json({ error: "Internal server error: " + (error.message || "Unknown error") }, { status: 500 });
  }
}