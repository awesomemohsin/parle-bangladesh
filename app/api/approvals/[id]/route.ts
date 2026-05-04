import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ORDER_STATUS, ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { ApprovalRequest, Product, Order, Category, Notification } from "@/lib/models";
import { notifyOwnerApprovalRequired, notifyApprovalFinalized } from "@/lib/telegram";
import { logAdminActivity } from "@/lib/activity";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { status, comment } = body; // 'approved' or 'declined'

    if (!['approved', 'declined'].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const approvalRequest = await ApprovalRequest.findById(id);
    if (!approvalRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (approvalRequest.status !== 'pending') {
      return NextResponse.json({ error: "Already processed" }, { status: 400 });
    }

    const userName = (user.name || user.email || "Unknown").toLowerCase();
    const isAnindo = userName.includes("anindo");
    const isSaiful = userName.includes("saiful");
    const isRazu = userName.includes("razu");

    // Decline logic - If anyone declines, it's final
    if (status === 'declined') {
      approvalRequest.status = 'declined';
      approvalRequest.declinedBy = user.name || user.email;
      if (comment) {
        if (!approvalRequest.comments) approvalRequest.comments = [];
        approvalRequest.comments.push({ user: userName, text: comment, date: new Date() });
      }
      await approvalRequest.save();

      // Notify Requester (Admin) of the decline
      await Notification.create({
        userId: approvalRequest.requesterEmail,
        title: "Request Declined",
        message: `Your change request for ${approvalRequest.targetName} was declined during the ${approvalRequest.stage === 'superadmin' ? 'Initial' : 'Final'} Verification Phase${comment ? `. Reason: ${comment}` : ""}.`,
        type: "alert",
        targetLink: `/admin/products`
      });
      
      // Log audit
      await logAdminActivity({
        adminEmail: user.email,
        action: `decline_request`,
        targetId: approvalRequest.targetId,
        targetName: approvalRequest.targetName,
        details: `${approvalRequest.type} ${approvalRequest.field} change from ${approvalRequest.oldValue} to ${approvalRequest.newValue} was DECLINED during ${approvalRequest.stage === 'superadmin' ? 'Superadmin' : 'Final Authorized'} review by ${userName}.`
      });

      // Notify via Telegram
      await notifyApprovalFinalized(approvalRequest);

      return NextResponse.json({ message: "Request declined successfully", request: approvalRequest });
    }

    // Approval logic
    if (status === 'approved') {
      if (isAnindo || isSaiful) {
        // Stage 1: Superadmin
        if (approvalRequest.stage !== 'superadmin') {
           return NextResponse.json({ error: "Superadmin approval already complete" }, { status: 400 });
        }
        
        if (approvalRequest.superadminApprovals.some((a: string) => a.toLowerCase().includes(userName))) {
           return NextResponse.json({ error: "You already approved this request" }, { status: 400 });
        }

        approvalRequest.superadminApprovals.push(userName);
        
        const superApprovals = approvalRequest.superadminApprovals.map((a: string) => a.toLowerCase());
        const hasAnindo = superApprovals.some((a: string) => a.includes("anindo"));
        const hasSaiful = superApprovals.some((a: string) => a.includes("saiful"));
        
        if (hasAnindo && hasSaiful) {
          // CHECK IF THIS IS A 2-STAGE OR 3-STAGE REQUEST
          const isFinancialOrStock = ['price', 'dealerPrice', 'stock', 'discountPrice'].includes(approvalRequest.field);
          
          if (!isFinancialOrStock) {
            // BASIC CONTENT: 2nd SuperAdmin is Final
            approvalRequest.status = 'approved';
            
            // Notify Requester (Admin)
            await Notification.create({
              userId: approvalRequest.requesterEmail,
              title: "Update Approved (Live)",
              message: `Your catalog update for ${approvalRequest.targetName} has been approved by consensus and is now LIVE.`,
              type: "system",
              targetLink: `/admin/products`
            });
            
            await applyApprovedChanges(approvalRequest, userName, comment);
            await notifyApprovalFinalized(approvalRequest);
          } else {
            // PRICE OR STOCK: 3-STAGE (Needs Owner after 2 Superadmins)
            approvalRequest.stage = "owner";
            await Notification.create({
              role: ROLES.OWNER,
              title: "Authorization Required",
              message: `A sensitive change (${approvalRequest.field}) for ${approvalRequest.targetName} requires your final signature.`,
              type: "approval",
              targetLink: `/admin/approvals`
            });

            // Trigger Telegram to Owner
            await notifyOwnerApprovalRequired(approvalRequest);
          }
        }

        if (comment) {
          if (!approvalRequest.comments) approvalRequest.comments = [];
          approvalRequest.comments.push({ user: userName, text: comment, date: new Date() });
        }
      } else if (isRazu) {
        // Stage 2: Owner
        if (approvalRequest.stage === 'superadmin') {
          return NextResponse.json({ error: "Waiting for Superadmin (Anindo & Saiful) approval first" }, { status: 400 });
        }
        
        approvalRequest.ownerApproved = true;
        approvalRequest.status = 'approved';

        if (comment) {
          if (!approvalRequest.comments) approvalRequest.comments = [];
          approvalRequest.comments.push({ user: userName, text: comment, date: new Date() });
        }

        // Notify Requester (Admin)
        await Notification.create({
          userId: approvalRequest.requesterEmail,
          title: "Request Approved (Final)",
          message: `Your sensitive change for ${approvalRequest.targetName} has been fully approved by Anindo, Saiful, and Razu.`,
          type: "system",
          targetLink: `/admin/products`
        });

        await applyApprovedChanges(approvalRequest, userName, comment);
        await notifyApprovalFinalized(approvalRequest);
      } else {
        return NextResponse.json({ error: "Forbidden: You are not authorized for consensus approval" }, { status: 403 });
      }

      await approvalRequest.save();

      // Log audit
      await logAdminActivity({
        adminEmail: user.email,
        action: `approve_request_stage`,
        targetId: approvalRequest.targetId,
        targetName: approvalRequest.targetName,
        details: `${approvalRequest.type} ${approvalRequest.field} update approved during ${approvalRequest.stage === 'superadmin' ? 'Initial' : 'Final Authoritative'} review by ${userName}. Status: ${approvalRequest.status}`
      });

      return NextResponse.json({ message: "Approval recorded successfully", request: approvalRequest });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Approval process error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function applyApprovedChanges(approvalRequest: any, userName: string, comment?: string) {
  if (approvalRequest.type === 'product') {
    const product = await Product.findById(approvalRequest.targetId);
    if (!product) {
      console.error(`ApplyChanges: Product ${approvalRequest.targetId} not found`);
      return;
    }

    const field = approvalRequest.field;
    const newValue = approvalRequest.newValue;
    const isNumeric = field === 'price' || field === 'dealerPrice' || field === 'stock' || field === 'discountPrice';

    if (approvalRequest.variationIndex !== undefined && approvalRequest.variationIndex !== null) {
      const varIndex = Number(approvalRequest.variationIndex);
      const variation = product.variations[varIndex];
      
      if (variation) {
        // Special logic for stock history
        if (field === 'stock') {
          const oldVal = Number(approvalRequest.oldValue || 0);
          const newValNumeric = Number(newValue);
          if (newValNumeric > oldVal) {
            if (!variation.stockHistory) variation.stockHistory = [];
            variation.stockHistory.push({
              amount: newValNumeric - oldVal,
              date: new Date(),
              reason: "Inventory Replenishment (Approved)"
            });
          }
        }
        
        // Use Database .set() for deep path reliability
        const typedVal = isNumeric ? Number(newValue) : newValue;
        variation.set(field, typedVal);
        product.markModified('variations');
      }
    } else {
      // Apply change to product level
      const typedVal = isNumeric ? Number(newValue) : newValue;
      product.set(field, typedVal);
    }
    
    await product.save();
    // Changes applied successfully
  } else if (approvalRequest.type === 'category') {
    const category = await Category.findById(approvalRequest.targetId);
    if (category) {
      category.set(approvalRequest.field, approvalRequest.newValue);
      await category.save();
    }
  } else if (approvalRequest.type === 'order') {
    const order = await Order.findById(approvalRequest.targetId);
    if (order && approvalRequest.field === 'status') {
      const oldStatus = order.status;
      const newStatus = approvalRequest.newValue;
      order.status = newStatus;

      if (!order.orderLogs) order.orderLogs = [];
      order.orderLogs.push({
        fromStatus: oldStatus,
        toStatus: newStatus as any,
        changedBy: `System (Approved: ${userName})`,
        reason: `Final consensus approval reached.`,
        changedAt: new Date(),
      });
      await order.save();
    }
  }
}
