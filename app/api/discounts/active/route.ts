import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { PromoCode } from '@/lib/models';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();
    // Only return active flat discounts (no promo codes, they require validation)
    const discounts = await PromoCode.find({ 
      type: 'flat', 
      isActive: true 
    }).lean();
    
    return NextResponse.json(discounts);
  } catch (error: any) {
    console.error('Error fetching active discounts:', error);
    return NextResponse.json({ error: 'Failed to fetch discounts' }, { status: 500 });
  }
}
