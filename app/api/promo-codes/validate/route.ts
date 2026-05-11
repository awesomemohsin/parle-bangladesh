import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { PromoCode } from '@/lib/models';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Promo code is required' }, { status: 400 });
    }

    const subtotal = Number(searchParams.get('subtotal') || 0);
    const productIds = searchParams.get('productIds')?.split(',').filter(Boolean) || [];

    await dbConnect();
    
    // Find exact active match
    const promo = await PromoCode.findOne({ code: code.toUpperCase(), isActive: true, type: 'promo' });
    
    if (!promo) {
      return NextResponse.json({ error: 'Invalid or inactive promo code.' }, { status: 404 });
    }

    // Check usage limits
    if (promo.currentUsage >= promo.maxUsage) {
      return NextResponse.json({ error: 'Promo code usage limit has been reached.' }, { status: 400 });
    }

    // Check expiration date
    if (promo.expiresAt) {
      const now = new Date();
      if (now > promo.expiresAt) {
        return NextResponse.json({ error: 'Promo code has expired.' }, { status: 400 });
      }
    }

    // Check minimum order amount
    if (promo.minOrderAmount > 0 && subtotal > 0 && subtotal < promo.minOrderAmount) {
      return NextResponse.json({ error: `You need a minimum order of ৳ ${promo.minOrderAmount} to use this promo code.` }, { status: 400 });
    }

    // Check product applicability
    if (!promo.allProducts && productIds.length > 0 && promo.applicableProducts && promo.applicableProducts.length > 0) {
      const applicableSet = new Set(promo.applicableProducts.map((id: any) => id.toString().trim().toLowerCase()));
      const hasMatch = productIds.some((id: string) => applicableSet.has(id.trim().toLowerCase()));
      if (!hasMatch) {
        return NextResponse.json({ error: 'This promo code is not applicable to the items in your cart.' }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      code: promo.code,
      type: promo.type,
      discountType: promo.discountType,
      discountAmount: promo.discountAmount,
      allProducts: promo.allProducts,
      applicableProducts: promo.applicableProducts,
      minOrderAmount: promo.minOrderAmount
    });

  } catch (error: any) {
    console.error('Error validating promo code:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { code, subtotal, productIds = [] } = body;

    if (!code) {
      return NextResponse.json({ error: 'Promo code is required' }, { status: 400 });
    }

    await dbConnect();
    
    // Find exact active match
    const promo = await PromoCode.findOne({ code: code.toUpperCase(), isActive: true, type: 'promo' });
    
    if (!promo) {
      return NextResponse.json({ error: 'Invalid or inactive promo code.' }, { status: 404 });
    }

    // Check usage limits
    if (promo.currentUsage >= promo.maxUsage) {
      return NextResponse.json({ error: 'Promo code usage limit has been reached.' }, { status: 400 });
    }

    // Check expiration date
    if (promo.expiresAt) {
      const now = new Date();
      if (now > promo.expiresAt) {
        return NextResponse.json({ error: 'Promo code has expired.' }, { status: 400 });
      }
    }

    // Check minimum order amount
    if (promo.minOrderAmount > 0 && subtotal > 0 && subtotal < promo.minOrderAmount) {
      return NextResponse.json({ error: `You need a minimum order of ৳ ${promo.minOrderAmount} to use this promo code.` }, { status: 400 });
    }

    // Check product applicability
    if (!promo.allProducts && productIds.length > 0 && promo.applicableProducts && promo.applicableProducts.length > 0) {
      const applicableSet = new Set(promo.applicableProducts.map((id: any) => id.toString().trim().toLowerCase()));
      const hasMatch = productIds.some((id: string) => applicableSet.has(id.trim().toLowerCase()));
      if (!hasMatch) {
        return NextResponse.json({ error: 'This promo code is not applicable to the items in your cart.' }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      code: promo.code,
      type: promo.type,
      discountType: promo.discountType,
      discountAmount: promo.discountAmount,
      allProducts: promo.allProducts,
      applicableProducts: promo.applicableProducts,
      minOrderAmount: promo.minOrderAmount,
      maxDiscountAmount: promo.maxDiscountAmount
    });

  } catch (error: any) {
    console.error('Error validating promo code:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
