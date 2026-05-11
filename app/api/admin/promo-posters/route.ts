import { NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import dbConnect from '@/lib/db';
import { PromoPoster } from '@/lib/models';
import { getAuthUserFromRequest, hasAnyRole } from '@/lib/api-auth';
import { ROLES } from '@/lib/constants';

export async function GET(req: Request) {
  try {
    const user = getAuthUserFromRequest(req as any);
    if (!user || !hasAnyRole(user, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.OWNER])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const posters = await PromoPoster.find().sort({ createdAt: -1 });
    return NextResponse.json(posters);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch posters' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = getAuthUserFromRequest(req as any);
    if (!user || !hasAnyRole(user, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.OWNER])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const link = formData.get('link') as string;
    const altText = formData.get('altText') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 1. Upload to Vercel Blob
    const blob = await put(`promo/${Date.now()}-${file.name}`, file, {
      access: 'public',
    });

    // 2. Save to MongoDB
    await dbConnect();
    const newPoster = await PromoPoster.create({
      imageUrl: blob.url,
      link: link || '/shop',
      altText: altText || 'Special Promotion',
      isActive: true,
      order: 0
    });

    return NextResponse.json(newPoster);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload poster' }, { status: 500 });
  }
}
