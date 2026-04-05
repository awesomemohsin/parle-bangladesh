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

    const { code, discountAmount, maxUsage, expiresAt, isActive } = await req.json();

    if (!code || !discountAmount || !maxUsage) {
      return NextResponse.json({ error: 'Code, discount amount, and max usage are required' }, { status: 400 });
    }

    await dbConnect();
    
    // Check if code already exists
    const existing = await PromoCode.findOne({ code: code.toUpperCase() });
    if (existing) {
      return NextResponse.json({ error: 'Promo code already exists' }, { status: 400 });
    }

    const newPromo = await PromoCode.create({
      code: code.toUpperCase(),
      discountAmount,
      maxUsage,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      isActive: isActive !== undefined ? isActive : true,
    });

    return NextResponse.json(newPromo, { status: 201 });
  } catch (error: any) {
    console.error('Error creating promo code:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
