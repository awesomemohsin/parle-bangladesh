import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Offer } from '@/lib/models';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { slug } = await params;
    await dbConnect();
    const offer = await Offer.findOne({ slug: slug.toLowerCase() });
    
    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    const response = NextResponse.json(offer);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return response;
  } catch (error: any) {
    console.error('[Public Offers] Fetch single offer failed:', error);
    return NextResponse.json({ error: 'Failed to fetch offer details' }, { status: 500 });
  }
}
