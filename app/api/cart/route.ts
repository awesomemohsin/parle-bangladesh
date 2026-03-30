import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Cart } from "@/lib/models";
import { getAuthUserFromRequest } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cart = await Cart.findOne({ userId: user.id }).lean();
    if (!cart) {
      return NextResponse.json({ items: [] });
    }

    return NextResponse.json({ 
      items: cart.items,
      promoCode: cart.promoCode,
      discountAmount: cart.discountAmount
    });
  } catch (error: any) {
    console.error("Cart GET err:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { items, promoCode, discountAmount } = await request.json();

    if (!items || items.length === 0) {
      await Cart.deleteOne({ userId: user.id });
      return NextResponse.json({ success: true, items: [] });
    }

    let cart = await Cart.findOne({ userId: user.id });
    if (!cart) {
      cart = new Cart({ 
        userId: user.id, 
        items,
        promoCode,
        discountAmount
      });
    } else {
      cart.items = items;
      cart.promoCode = promoCode;
      cart.discountAmount = discountAmount;
    }

    await cart.save();
    return NextResponse.json({ 
      success: true, 
      items: cart.items,
      promoCode: cart.promoCode,
      discountAmount: cart.discountAmount
    });
  } catch (error: any) {
    console.error("Cart POST err:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
