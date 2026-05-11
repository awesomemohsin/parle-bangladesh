import { NextResponse } from 'next/server';
import { getAuthUserFromRequest, hasAnyRole } from '@/lib/api-auth';
import { ROLES } from '@/lib/constants';
import dbConnect from '@/lib/db';
import { PromoCode, ApprovalRequest, Notification } from '@/lib/models';
import { notifyNewApprovalRequest } from '@/lib/telegram';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getAuthUserFromRequest(req as any);
    if (!user || !hasAnyRole(user, [ROLES.ADMIN, ROLES.MODERATOR, ROLES.SUPER_ADMIN, ROLES.OWNER])) {
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
    const { id } = await params;
    const existingPromo = await PromoCode.findById(id);
    
    if (!existingPromo) {
      return NextResponse.json({ error: 'Promo code not found' }, { status: 404 });
    }

    // ALL updates require Level 2 approval
    // We set the live promo code to pending and inactive
    existingPromo.status = 'pending';
    existingPromo.isActive = false;
    await existingPromo.save();

    // Create the approval request with the NEW values in targetDetails
    const approvalRequest = new ApprovalRequest({
      requesterEmail: user.email,
      type: "promo-code",
      targetId: id,
      targetName: existingPromo.type === 'promo' ? `Promo: ${existingPromo.code}` : `Flat Discount: ${existingPromo.discountAmount}${existingPromo.discountType === 'percentage' ? '%' : '৳'}`,
      field: "update",
      oldValue: JSON.stringify(existingPromo.toObject()),
      newValue: "updated_configuration",
      status: "pending",
      stage: "superadmin",
      targetDetails: updates, // Store the new values to be applied
    });
    await approvalRequest.save();

    // Create notification for Level 2 admins
    await Notification.create({
      role: ROLES.SUPER_ADMIN,
      title: "Promo Code Update Requires Authorization",
      message: `${user.name || user.email} updated ${existingPromo.code || 'a discount'} which now requires Level 2 authorization to go live again.`,
      type: "approval",
      targetLink: "/admin/approvals/promo-codes"
    });

    // Telegram notification
    try {
      await notifyNewApprovalRequest(approvalRequest.toObject());
    } catch (tgErr) {
      console.error("Telegram notification failed", tgErr);
    }

    return NextResponse.json({ message: "Update submitted for approval", status: "pending" });
  } catch (error: any) {
    console.error('Error updating promo code:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getAuthUserFromRequest(req as any);
    if (!user || !hasAnyRole(user, [ROLES.ADMIN, ROLES.MODERATOR, ROLES.SUPER_ADMIN, ROLES.OWNER])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const resolvedParams = await params;
    const deletedPromo = await PromoCode.findByIdAndDelete(resolvedParams.id);

    if (!deletedPromo) {
      return NextResponse.json({ error: 'Promo code not found' }, { status: 404 });
    }

    // Also delete any associated pending approval requests to prevent "ghost" requests
    await ApprovalRequest.deleteMany({ targetId: resolvedParams.id, type: 'promo-code' });

    return NextResponse.json({ message: 'Promo code deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting promo code:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
