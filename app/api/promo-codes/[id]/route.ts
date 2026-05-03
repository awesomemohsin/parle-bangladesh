import { NextResponse } from 'next/server';
import { getAuthUserFromRequest, hasAnyRole } from '@/lib/api-auth';
import { ROLES } from '@/lib/constants';
import dbConnect from '@/lib/db';
import { PromoCode } from '@/lib/models';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getAuthUserFromRequest(req as any);
    if (!user || !hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.OWNER])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await req.json();

    if ('code' in updates) {
      updates.code = updates.code.toUpperCase();
    }
    
    // Explicit transformation for expiresAt (could be empty string if user clears field)
    if ('expiresAt' in updates) {
        if (!updates.expiresAt) {
           updates.$unset = { expiresAt: 1 };
           delete updates.expiresAt;
        } else {
           updates.expiresAt = new Date(updates.expiresAt);
        }
    }

    await dbConnect();
    const resolvedParams = await params;
    const updatedPromo = await PromoCode.findByIdAndUpdate(resolvedParams.id, updates, { returnDocument: 'after' });
    
    if (!updatedPromo) {
      return NextResponse.json({ error: 'Promo code not found' }, { status: 404 });
    }

    return NextResponse.json(updatedPromo);
  } catch (error: any) {
    console.error('Error updating promo code:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getAuthUserFromRequest(req as any);
    if (!user || !hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.OWNER])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const resolvedParams = await params;
    const deletedPromo = await PromoCode.findByIdAndDelete(resolvedParams.id);

    if (!deletedPromo) {
      return NextResponse.json({ error: 'Promo code not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Promo code deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting promo code:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
