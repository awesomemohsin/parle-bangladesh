import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Offer } from '@/lib/models';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();
    const activeOffers = await Offer.find({
      isActive: true,
      offerEndsAt: { $gt: new Date() }
    }).sort({ offerEndsAt: 1 });

    const response = NextResponse.json(activeOffers);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return response;
  } catch (error: any) {
    console.error('[Public Offers] Fetch active failed:', error);
    return NextResponse.json({ error: 'Failed to fetch active offers' }, { status: 500 });
  }
}
