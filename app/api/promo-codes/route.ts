import { NextResponse } from 'next/server';
import { getAuthUserFromRequest, hasAnyRole } from '@/lib/api-auth';
import { ROLES } from '@/lib/constants';
import dbConnect from '@/lib/db';
import { PromoCode, ApprovalRequest, Notification } from '@/lib/models';
import { notifyNewApprovalRequest } from '@/lib/telegram';

export async function GET(req: Request) {
  try {
    const user = getAuthUserFromRequest(req as any);
    if (!user || !hasAnyRole(user, [ROLES.ADMIN, ROLES.MODERATOR, ROLES.SUPER_ADMIN, ROLES.OWNER])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const promoCodes = await PromoCode.find().sort({ createdAt: -1 }).lean();
    
    // Fetch all pending approval requests for promo-codes
    const pendingApprovals = await ApprovalRequest.find({
      type: 'promo-code',
      status: 'pending'
    }).lean();

    // Map targetId to targetDetails updates
    const pendingMap = new Map();
    for (const appReq of pendingApprovals) {
      if (appReq.targetDetails) {
        pendingMap.set(appReq.targetId.toString(), appReq.targetDetails);
      }
    }

    // Self-healing migration: resolve creators from ApprovalRequest if createdBy is empty
    const resolvedPromoCodes = await Promise.all(
      promoCodes.map(async (promo) => {
        if (!promo.createdBy) {
          const approval = await ApprovalRequest.findOne({
            targetId: promo._id.toString(),
            type: 'promo-code'
          }).select('requesterEmail').lean();
          
          if (approval?.requesterEmail) {
            promo.createdBy = approval.requesterEmail;
            // Persist migrated value back to DB for future speed
            PromoCode.updateOne({ _id: promo._id }, { createdBy: approval.requesterEmail }).catch(err => 
              console.error(`Failed to persist migrated createdBy for ${promo._id}:`, err)
            );
          } else {
            promo.createdBy = 'System';
          }
        }

        // Merge pending updates so the admin discounts page displays the latest edited configuration
        const pendingUpdates = pendingMap.get(promo._id.toString());
        if (pendingUpdates) {
          Object.assign(promo, pendingUpdates);
        }

        return promo;
      })
    );

    return NextResponse.json(resolvedPromoCodes);
  } catch (error: any) {
    console.error('Error fetching promo codes:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = getAuthUserFromRequest(req as any);
    if (!user || !hasAnyRole(user, [ROLES.ADMIN, ROLES.MODERATOR, ROLES.SUPER_ADMIN, ROLES.OWNER])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { code, type, discountType, discountAmount, maxUsage, expiresAt, isActive, allProducts, applicableProducts, applicableVariations, minOrderAmount, maxDiscountAmount, freeShipping } = body;

    if (type === 'promo' && !code) {
      return NextResponse.json({ error: 'Code is required for promo type' }, { status: 400 });
    }

    if (!discountAmount) {
      return NextResponse.json({ error: 'Discount amount is required' }, { status: 400 });
    }

    await dbConnect();
    
    // Check if code already exists if provided
    if (code) {
      const existing = await PromoCode.findOne({ code: code.toUpperCase() });
      if (existing) {
        return NextResponse.json({ error: 'Promo code already exists' }, { status: 400 });
      }
    }

    const newPromo = await PromoCode.create({
      code: code ? code.toUpperCase() : undefined,
      type: type || 'promo',
      discountType: discountType || 'fixed',
      discountAmount,
      maxUsage: maxUsage || 999999,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      isActive: false,
      status: 'pending',
      allProducts: allProducts !== undefined ? allProducts : false,
      applicableProducts: applicableProducts || [],
      applicableVariations: applicableVariations || [],
      minOrderAmount: Number(minOrderAmount) || 0,
      maxDiscountAmount: Number(maxDiscountAmount) || 0,
      createdBy: user.name || user.email,
      freeShipping: freeShipping !== undefined ? freeShipping : false,
    });

    // Create approval request for ALL new promo codes
    const approvalRequest = new ApprovalRequest({
      requesterEmail: user.email,
      type: "promo-code",
      targetId: newPromo._id,
      targetName: type === 'promo' ? `Promo: ${code}` : `Flat Discount: ${discountAmount}${discountType === 'percentage' ? '%' : '৳'}`,
      field: "creation",
      oldValue: "none",
      newValue: "active",
      status: "pending",
      stage: "superadmin",
      targetDetails: newPromo.toObject(),
    });
    await approvalRequest.save();

    // Create notification for Level 2 admins
    await Notification.create({
      role: ROLES.SUPER_ADMIN,
      title: "New Promo Code Approval Required",
      message: `${user.name || user.email} created a new ${type === 'promo' ? 'promo code' : 'flat discount'} that requires Level 2 approval.`,
      type: "approval",
      targetLink: "/admin/approvals/promo-codes"
    });

    // Telegram notification
    try {
      await notifyNewApprovalRequest(approvalRequest.toObject());
    } catch (tgErr) {
      console.error("Telegram notification failed", tgErr);
    }

    return NextResponse.json(newPromo, { status: 201 });
  } catch (error: any) {
    console.error('Error creating promo code:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
