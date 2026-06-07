import { NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import dbConnect from '@/lib/db';
import { Offer } from '@/lib/models';
import { getAuthUserFromRequest, hasAnyRole } from '@/lib/api-auth';
import { ROLES } from '@/lib/constants';
import { logAdminActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = getAuthUserFromRequest(req as any);
    if (!user || !hasAnyRole(user, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MODERATOR])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const slug = formData.get('slug') as string | null;
    const description = formData.get('description') as string | null;
    const offerEndsAtStr = formData.get('offerEndsAt') as string | null;
    const isActiveStr = formData.get('isActive') as string | null;
    const buttonText = formData.get('buttonText') as string | null;
    const buttonLink = formData.get('buttonLink') as string | null;

    await dbConnect();
    const offer = await Offer.findById(id);
    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    const updateData: any = {};

    if (title) updateData.title = title;
    if (slug) {
      const cleanSlug = slug.toLowerCase();
      if (cleanSlug !== offer.slug) {
        const existing = await Offer.findOne({ slug: cleanSlug });
        if (existing) {
          return NextResponse.json({ error: 'An offer with this slug already exists' }, { status: 409 });
        }
        updateData.slug = cleanSlug;
      }
    }
    if (description) updateData.description = description;
    if (offerEndsAtStr) updateData.offerEndsAt = new Date(offerEndsAtStr);
    if (isActiveStr !== null) updateData.isActive = isActiveStr === 'true';
    if (buttonText !== null) updateData.buttonText = buttonText;
    if (buttonLink !== null) updateData.buttonLink = buttonLink;

    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (file) {
      if (!token) {
        return NextResponse.json({ error: 'Configuration error: Blob token missing' }, { status: 500 });
      }

      // Upload new image
      let blob;
      try {
        blob = await put(`offers/${Date.now()}-${file.name}`, file, {
          access: 'public',
          token: token,
        });
        updateData.image = blob.url;
      } catch (blobError: any) {
        console.error('[Admin Offers] Vercel Blob upload failed:', blobError);
        return NextResponse.json({ error: 'Image upload failed', details: blobError.message }, { status: 500 });
      }

      // Delete old image if it is from Vercel Blob
      if (offer.image && offer.image.includes('public.blob.vercel-storage.com')) {
        try {
          await del(offer.image, { token });
        } catch (delError) {
          console.error('[Admin Offers] Failed to delete old image blob:', delError);
          // Don't fail the request if deletion of old image fails
        }
      }
    }

    const updatedOffer = await Offer.findByIdAndUpdate(id, updateData, { new: true });

    // Log Activity
    await logAdminActivity({
      adminEmail: user.email,
      action: 'update_offer',
      targetId: id,
      targetName: updatedOffer?.title || offer.title,
      details: `Updated offer: ${JSON.stringify(updateData)}`,
    });

    return NextResponse.json(updatedOffer);
  } catch (error: any) {
    console.error('[Admin Offers] Update failed:', error);
    return NextResponse.json({ error: 'Failed to update offer', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = getAuthUserFromRequest(req as any);
    if (!user || !hasAnyRole(user, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MODERATOR])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const offer = await Offer.findById(id);
    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;

    // Delete image from Vercel Blob
    if (offer.image && offer.image.includes('public.blob.vercel-storage.com') && token) {
      try {
        await del(offer.image, { token });
      } catch (delError) {
        console.error('[Admin Offers] Failed to delete image blob:', delError);
      }
    }

    await Offer.findByIdAndDelete(id);

    // Log Activity
    await logAdminActivity({
      adminEmail: user.email,
      action: 'delete_offer',
      targetId: id,
      targetName: offer.title,
      details: `Deleted offer: ${offer.title} (${offer.slug})`,
    });

    return NextResponse.json({ success: true, message: 'Offer deleted successfully' });
  } catch (error: any) {
    console.error('[Admin Offers] Delete failed:', error);
    return NextResponse.json({ error: 'Failed to delete offer', details: error.message }, { status: 500 });
  }
}
