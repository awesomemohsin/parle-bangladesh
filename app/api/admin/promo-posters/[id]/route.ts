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
    const user = getAuthUserFromRequest(req as any);
    if (!user || !hasAnyRole(user, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.OWNER])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    await dbConnect();
    
    const poster = await PromoPoster.findById(id);
    if (!poster) {
      return NextResponse.json({ error: 'Poster not found' }, { status: 404 });
    }

    // 1. Delete from Vercel Blob
    try {
      await del(poster.imageUrl);
    } catch (err) {
      console.error('Failed to delete from Blob:', err);
      // Continue even if blob deletion fails to keep DB clean
    }

    // 2. Delete from MongoDB
    await PromoPoster.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Poster deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete poster' }, { status: 500 });
  }
}

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
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

        return NextResponse.json(poster);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update poster' }, { status: 500 });
    }
}
