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
    const variations = searchParams.get('variations')?.split(',').filter(Boolean) || [];

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

    // Check product & variation applicability
    if (!promo.allProducts && productIds.length > 0) {
      const applicableProducts = promo.applicableProducts || [];
      const applicableVariations = promo.applicableVariations || [];
      
      const prodSet = new Set(applicableProducts.map((id: any) => id.toString().trim().toLowerCase()));
      const hasProdMatch = productIds.some((id: string) => prodSet.has(id.trim().toLowerCase()));
      
      if (!hasProdMatch) {
        return NextResponse.json({ error: 'This promo code is not applicable to the items in your cart.' }, { status: 400 });
      }
      
      if (applicableVariations.length > 0 && variations.length > 0) {
        const varSet = new Set(applicableVariations.map((v: string) => v.trim().toLowerCase()));
        const hasVarMatch = variations.some((v: string) => varSet.has(v.trim().toLowerCase()));
        if (!hasVarMatch) {
          return NextResponse.json({ error: 'This promo code is not applicable to the items in your cart.' }, { status: 400 });
        }
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
      applicableVariations: promo.applicableVariations || [],
      minOrderAmount: promo.minOrderAmount,
      freeShipping: promo.freeShipping
    });

  } catch (error: any) {
    console.error('Error validating promo code:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { code, subtotal, productIds = [], variations = [] } = body;

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

    // Check product & variation applicability
    if (!promo.allProducts && productIds.length > 0) {
      const applicableProducts = promo.applicableProducts || [];
      const applicableVariations = promo.applicableVariations || [];
      
      const prodSet = new Set(applicableProducts.map((id: any) => id.toString().trim().toLowerCase()));
      const hasProdMatch = productIds.some((id: string) => prodSet.has(id.trim().toLowerCase()));
      
      if (!hasProdMatch) {
        return NextResponse.json({ error: 'This promo code is not applicable to the items in your cart.' }, { status: 400 });
      }
      
      if (applicableVariations.length > 0 && variations.length > 0) {
        const varSet = new Set(applicableVariations.map((v: string) => v.trim().toLowerCase()));
        const hasVarMatch = variations.some((v: string) => varSet.has(v.trim().toLowerCase()));
        if (!hasVarMatch) {
          return NextResponse.json({ error: 'This promo code is not applicable to the items in your cart.' }, { status: 400 });
        }
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
      applicableVariations: promo.applicableVariations || [],
      minOrderAmount: promo.minOrderAmount,
      maxDiscountAmount: promo.maxDiscountAmount,
      freeShipping: promo.freeShipping
    });

  } catch (error: any) {
    console.error('Error validating promo code:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
