import { NextResponse } from 'next/server';
import { getAuthUserFromRequest, hasAnyRole } from '@/lib/api-auth';
import { ROLES } from '@/lib/constants';
import dbConnect from '@/lib/db';
import { PromoCode } from '@/lib/models';

export async function GET(req: Request) {
  try {
    const user = getAuthUserFromRequest(req as any);
    if (!user || !hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.OWNER])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const promoCodes = await PromoCode.find().sort({ createdAt: -1 });
    return NextResponse.json(promoCodes);
  } catch (error: any) {
    console.error('Error fetching promo codes:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = getAuthUserFromRequest(req as any);
    if (!user || !hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.OWNER])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code, type, discountType, discountAmount, maxUsage, expiresAt, isActive, allProducts, applicableProducts } = await req.json();

    if (type === 'promo' && !code) {
      return NextResponse.json({ error: 'Code is required for promo type' }, { status: 400 });
    }

    if (!discountAmount) {
      return NextResponse.json({ error: 'Discount amount is required' }, { status: 400 });
    }

    await dbConnect();
    
    // Check if code already exists if provided
    if (code) {
      const existing = await PromoCode.findOne({ code: code.toUpperCase() });
      if (existing) {
        return NextResponse.json({ error: 'Promo code already exists' }, { status: 400 });
      }
    }

    const newPromo = await PromoCode.create({
      code: code ? code.toUpperCase() : undefined,
      type: type || 'promo',
      discountType: discountType || 'fixed',
      discountAmount,
      maxUsage: maxUsage || 999999,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      isActive: isActive !== undefined ? isActive : true,
      allProducts: allProducts !== undefined ? allProducts : false,
      applicableProducts: applicableProducts || [],
    });

    return NextResponse.json(newPromo, { status: 201 });
  } catch (error: any) {
    console.error('Error creating promo code:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
