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

    return NextResponse.json({
      success: true,
      code: promo.code,
      type: promo.type,
      discountType: promo.discountType,
      discountAmount: promo.discountAmount,
      allProducts: promo.allProducts,
      applicableProducts: promo.applicableProducts
    });

  } catch (error: any) {
    console.error('Error validating promo code:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

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

    return NextResponse.json({
      success: true,
      code: promo.code,
      type: promo.type,
      discountType: promo.discountType,
      discountAmount: promo.discountAmount,
      allProducts: promo.allProducts,
      applicableProducts: promo.applicableProducts
    });

  } catch (error: any) {
    console.error('Error validating promo code:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
