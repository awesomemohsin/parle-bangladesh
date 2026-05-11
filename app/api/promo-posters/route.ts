import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const promoDir = path.join(process.cwd(), 'public', 'images', 'promo');
    
    // Check if directory exists
    try {
      await fs.access(promoDir);
    } catch {
      return NextResponse.json([]);
    }

    const files = await fs.readdir(promoDir);
    
    // Filter for images and map to URLs
    const posters = files
      .filter(file => /\.(png|jpg|jpeg|webp|gif)$/i.test(file))
      .map((file, index) => ({
        id: index + 1,
        image: `/images/promo/${file}`,
        link: '/shop',
        alt: `Promotion ${index + 1}`
      }));

    return NextResponse.json(posters);
  } catch (error) {
    console.error('Failed to read promo directory:', error);
    return NextResponse.json([], { status: 500 });
  }
}
