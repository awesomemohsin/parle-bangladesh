import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { PromoPoster } from '@/lib/models';

export async function GET() {
  try {
    await dbConnect();
    const posters = await PromoPoster.find({ isActive: true }).sort({ order: 1 });
    
    // Map to match the frontend expectations
    const formattedPosters = posters.map(p => ({
      id: p._id,
      image: p.imageUrl,
      link: p.link,
      alt: p.altText
    }));

    return NextResponse.json(formattedPosters);
  } catch (error) {
    console.error('Failed to fetch promo posters:', error);
    return NextResponse.json([], { status: 500 });
  }
}
