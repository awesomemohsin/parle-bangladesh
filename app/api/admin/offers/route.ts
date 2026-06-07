import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import dbConnect from '@/lib/db';
import { Offer } from '@/lib/models';
import { getAuthUserFromRequest, hasAnyRole } from '@/lib/api-auth';
import { ROLES } from '@/lib/constants';
import { logAdminActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = getAuthUserFromRequest(req as any);
    if (!user || !hasAnyRole(user, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MODERATOR])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const offers = await Offer.find().sort({ createdAt: -1 });
    const response = NextResponse.json(offers);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch offers', details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = getAuthUserFromRequest(req as any);
    if (!user || !hasAnyRole(user, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MODERATOR])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const slug = formData.get('slug') as string;
    const description = formData.get('description') as string;
    const offerEndsAtStr = formData.get('offerEndsAt') as string;
    const isActiveStr = formData.get('isActive') as string;
    const isActive = isActiveStr === 'false' ? false : true;
    const buttonText = formData.get('buttonText') as string || 'Shop Now';
    const buttonLink = formData.get('buttonLink') as string || '/shop';

    if (!title || !slug || !description || !offerEndsAtStr) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await dbConnect();

    // Check slug uniqueness
    const existing = await Offer.findOne({ slug: slug.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: 'An offer with this slug already exists' }, { status: 409 });
    }

    if (!file) {
      return NextResponse.json({ error: 'No image file uploaded' }, { status: 400 });
    }

    // Upload image to Vercel Blob
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      console.error('[Admin Offers] BLOB_READ_WRITE_TOKEN is missing');
      return NextResponse.json({ error: 'Configuration error: Blob token missing' }, { status: 500 });
    }

    let blob;
    try {
      blob = await put(`offers/${Date.now()}-${file.name}`, file, {
        access: 'public',
        token: token,
      });
    } catch (blobError: any) {
      console.error('[Admin Offers] Vercel Blob upload failed:', blobError);
      return NextResponse.json({ error: 'Image upload failed', details: blobError.message }, { status: 500 });
    }

    // Save to Database
    const newOffer = await Offer.create({
      title,
      slug: slug.toLowerCase(),
      description,
      image: blob.url,
      offerEndsAt: new Date(offerEndsAtStr),
      isActive,
      buttonText,
      buttonLink,
    });

    // Log Activity
    await logAdminActivity({
      adminEmail: user.email,
      action: 'create_offer',
      targetId: newOffer._id.toString(),
      targetName: newOffer.title,
      details: `Created offer: ${newOffer.title} (${newOffer.slug}) expiring on ${newOffer.offerEndsAt.toISOString()}`,
    });

    return NextResponse.json(newOffer, { status: 201 });
  } catch (error: any) {
    console.error('[Admin Offers] Create failed:', error);
    return NextResponse.json({ error: 'Failed to create offer', details: error.message }, { status: 500 });
  }
}
