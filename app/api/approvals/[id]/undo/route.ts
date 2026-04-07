import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { ApprovalRequest, Product, Order } from "@/lib/models";
import { logAdminActivity } from "@/lib/activity";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (user.role !== ROLES.OWNER && user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden: Higher authorization required to undo" }, { status: 403 });
    }

    const { id } = await params;
    const approvalRequest = await ApprovalRequest.findById(id);

    if (!approvalRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (approvalRequest.status === 'pending') {
      return NextResponse.json({ error: "Request is already pending" }, { status: 400 });
    }

    // Check 24 hour limit
    const now = new Date();
    const processedAt = new Date(approvalRequest.updatedAt);
    const diffHours = (now.getTime() - processedAt.getTime()) / (1000 * 60 * 60);

    if (diffHours > 24) {
      return NextResponse.json({ error: "Undo period (24h) has expired" }, { status: 400 });
    }

    const oldStatus = approvalRequest.status;
    
    // If it was approved, we must REVERT the changes in the target entity
    if (oldStatus === 'approved') {
      if (approvalRequest.type === 'product') {
        const product = await Product.findById(approvalRequest.targetId);
        if (product) {
          if (approvalRequest.variationIndex !== undefined) {
             const varIndex = Number(approvalRequest.variationIndex);
             if (product.variations[varIndex]) {
                // Revert to oldValue
                if (approvalRequest.field === 'price') product.variations[varIndex].price = Number(approvalRequest.oldValue);
                if (approvalRequest.field === 'stock') product.variations[varIndex].stock = Number(approvalRequest.oldValue);
             }
          } else {
             (product as any)[approvalRequest.field] = Number(approvalRequest.oldValue);
          }
          await product.save();
        }
      } else if (approvalRequest.type === 'order') {
        const order = await Order.findById(approvalRequest.targetId);
        if (order) {
           if (approvalRequest.field === 'status') {
              const currentStatus = order.status;
              order.status = approvalRequest.oldValue;
              
              if (!order.orderLogs) order.orderLogs = [];
              order.orderLogs.push({
                fromStatus: currentStatus,
                toStatus: approvalRequest.oldValue as any,
                changedBy: `Owner UNDO: ${user.email}`,
                reason: `Owner reverted the previously approved status change of ${approvalRequest.newValue}`,
                changedAt: new Date(),
              });
              await order.save();
           }
        }
      }
    } else if (oldStatus === 'declined') {
        // If it was declined, we don't need to revert the target entity 
        // because the target entity was never changed.
        // We just move back to pending.
    }

    // Move back to pending and RESET ALL SIGNATURES
    approvalRequest.status = 'pending';
    approvalRequest.stage = 'superadmin';
    approvalRequest.superadminApprovals = [];
    approvalRequest.ownerApproved = false;
    approvalRequest.ownerEmail = undefined;
    approvalRequest.ownerComment = undefined;
    approvalRequest.declinedBy = undefined;
    
    await approvalRequest.save();

    // Log the undo action
    await logAdminActivity({
      adminEmail: user.email,
      action: "undo_request",
      targetId: approvalRequest.targetId,
      targetName: approvalRequest.targetName,
      details: `Owner undone the ${oldStatus} ${approvalRequest.type} request. It is now back to pending.`
    });

    return NextResponse.json({ message: "Action undone successfully", request: approvalRequest });
  } catch (error) {
    console.error("Undo process error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
