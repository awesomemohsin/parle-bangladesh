import { NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import dbConnect from '@/lib/db';
import { PromoPoster } from '@/lib/models';
import { getAuthUserFromRequest, hasAnyRole } from '@/lib/api-auth';
import { ROLES } from '@/lib/constants';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`[Admin] Attempting to delete poster: ${id}`);
    const user = getAuthUserFromRequest(req as any);
    if (!user) {
      console.error('[Admin] Delete Failed: No user found in request');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasAnyRole(user, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.OWNER])) {
      console.error(`[Admin] Delete Failed: User ${user.email} does not have required role: ${user.role}`);
      return NextResponse.json({ error: 'Permission denied' }, { status: 401 });
    }

    await dbConnect();
    
    const poster = await PromoPoster.findById(id);
    if (!poster) {
      console.error(`[Admin] Poster not found: ${id}`);
      return NextResponse.json({ error: 'Poster not found' }, { status: 404 });
    }

    // 1. Delete from Vercel Blob
    try {
      if (poster.imageUrl.includes('blob.vercel-storage.com')) {
        console.log(`[Admin] Attempting to delete from Vercel Blob: ${poster.imageUrl}`);
        const token = process.env.BLOB_READ_WRITE_TOKEN;
        await del(poster.imageUrl, { token }); // Explicitly pass the token
        console.log(`[Admin] Deleted from Vercel Blob successfully`);
      }
    } catch (err: any) {
      console.error('[Admin] Failed to delete from Blob:', err);
      // We continue even if blob deletion fails, to ensure DB is cleaned up
      // but we log it.
    }

    // 2. Delete from MongoDB
    await PromoPoster.findByIdAndDelete(id);
    console.log(`[Admin] Deleted from MongoDB: ${id}`);

    return NextResponse.json({ message: 'Poster deleted successfully' });
  } catch (error) {
    console.error('[Admin] Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete poster' }, { status: 500 });
  }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        console.log(`[Admin] Updating poster: ${id}`);
        const user = getAuthUserFromRequest(req as any);
        if (!user) {
            console.error('[Admin] Patch Failed: No user found in request');
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        if (!hasAnyRole(user, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.OWNER])) {
            console.error(`[Admin] Patch Failed: User ${user.email} does not have required role: ${user.role}`);
            return NextResponse.json({ error: 'Permission denied' }, { status: 401 });
        }

        await dbConnect();

        const contentType = req.headers.get('content-type') || '';
        const updateData: any = {};

        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            const file = formData.get('file') as File | null;
            const link = formData.get('link') as string | null;
            const altText = formData.get('altText') as string | null;
            const placement = formData.get('placement') as string | null;
            const buttonText = formData.get('buttonText') as string | null;

            if (link !== null) updateData.link = link;
            if (altText !== null) updateData.altText = altText;
            if (placement !== null) updateData.placement = placement;
            if (buttonText !== null) updateData.buttonText = buttonText;

            if (file) {
                // Fetch the existing poster to delete old blob
                const existingPoster = await PromoPoster.findById(id);
                if (existingPoster && existingPoster.imageUrl.includes('blob.vercel-storage.com')) {
                    try {
                        const token = process.env.BLOB_READ_WRITE_TOKEN;
                        await del(existingPoster.imageUrl, { token });
                    } catch (delError) {
                        console.error('[Admin] Failed to delete old blob:', delError);
                    }
                }

                // Upload new file to Vercel Blob
                const token = process.env.BLOB_READ_WRITE_TOKEN;
                if (!token) {
                    return NextResponse.json({ error: 'Configuration error: Blob token missing' }, { status: 500 });
                }

                const blob = await put(`promo/${Date.now()}-${file.name}`, file, {
                    access: 'public',
                    token: token,
                });
                updateData.imageUrl = blob.url;
            }
        } else {
            const body = await req.json();
            const { isActive, link, altText, placement, buttonText } = body;
            if (isActive !== undefined) updateData.isActive = isActive;
            if (link !== undefined) updateData.link = link;
            if (altText !== undefined) updateData.altText = altText;
            if (placement !== undefined) updateData.placement = placement;
            if (buttonText !== undefined) updateData.buttonText = buttonText;
        }

        const poster = await PromoPoster.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!poster) {
            return NextResponse.json({ error: 'Poster not found' }, { status: 404 });
        }

        console.log(`[Admin] Poster ${id} updated successfully:`, updateData);
        return NextResponse.json(poster);
    } catch (error: any) {
        console.error('[Admin] PATCH error:', error);
        return NextResponse.json({ error: 'Failed to update poster', details: error.message }, { status: 500 });
    }
}
