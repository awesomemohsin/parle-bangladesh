import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import dbConnect from '@/lib/db';
import { PromoPoster } from '@/lib/models';
import { getAuthUserFromRequest, hasAnyRole } from '@/lib/api-auth';
import { ROLES } from '@/lib/constants';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`[Admin] Attempting to delete poster: ${params.id}`);
    const user = getAuthUserFromRequest(req as any);
    if (!user || !hasAnyRole(user, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.OWNER])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    await dbConnect();
    
    const poster = await PromoPoster.findById(id);
    if (!poster) {
      console.error(`[Admin] Poster not found: ${id}`);
      return NextResponse.json({ error: 'Poster not found' }, { status: 404 });
    }

    // 1. Delete from Vercel Blob
    try {
      if (poster.imageUrl.includes('blob.vercel-storage.com')) {
        await del(poster.imageUrl);
        console.log(`[Admin] Deleted from Vercel Blob: ${poster.imageUrl}`);
      }
    } catch (err) {
      console.error('[Admin] Failed to delete from Blob:', err);
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
    { params }: { params: { id: string } }
) {
    try {
        console.log(`[Admin] Toggling status for poster: ${params.id}`);
        const user = getAuthUserFromRequest(req as any);
        if (!user || !hasAnyRole(user, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.OWNER])) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { isActive } = body;

        await dbConnect();
        const poster = await PromoPoster.findByIdAndUpdate(
            params.id,
            { isActive },
            { new: true }
        );

        if (!poster) {
            return NextResponse.json({ error: 'Poster not found' }, { status: 404 });
        }

        console.log(`[Admin] Poster ${params.id} active status set to: ${isActive}`);
        return NextResponse.json(poster);
    } catch (error) {
        console.error('[Admin] PATCH error:', error);
        return NextResponse.json({ error: 'Failed to update poster' }, { status: 500 });
    }
}
