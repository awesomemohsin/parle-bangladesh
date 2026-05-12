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
    console.log('[PromoPoster] Starting Blob upload...');
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    
    if (!token) {
      console.error('[PromoPoster] BLOB_READ_WRITE_TOKEN is missing from environment variables');
      return NextResponse.json({ error: 'Configuration error: Blob token missing' }, { status: 500 });
    }

    let blob;
    try {
      blob = await put(`promo/${Date.now()}-${file.name}`, file, {
        access: 'public',
        token: token, // Explicitly pass the token
      });
      console.log('[PromoPoster] Blob uploaded successfully:', blob.url);
    } catch (blobError: any) {
      console.error('[PromoPoster] Vercel Blob upload failed:', blobError);
      return NextResponse.json({ 
        error: 'Blob upload failed', 
        details: blobError.message 
      }, { status: 500 });
    }

    // 2. Save to MongoDB
    console.log('[PromoPoster] Connecting to DB...');
    try {
      await dbConnect();
      const newPoster = await PromoPoster.create({
        imageUrl: blob.url,
        link: link || '/shop',
        altText: altText || 'Special Promotion',
        isActive: true,
        order: 0
      });
      console.log('[PromoPoster] Saved to DB:', newPoster._id);
      return NextResponse.json(newPoster);
    } catch (dbError: any) {
      console.error('[PromoPoster] MongoDB save failed:', dbError);
      return NextResponse.json({ 
        error: 'Database operation failed', 
        details: dbError.message 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload poster', details: error.message }, { status: 500 });
  }
}
