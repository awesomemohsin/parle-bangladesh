import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ORDER_STATUS, ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { ApprovalRequest, Product, Order } from "@/lib/models";
import { logAdminActivity } from "@/lib/activity";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (user.role !== ROLES.OWNER) {
      return NextResponse.json({ error: "Forbidden: Only owner can approve/decline" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, ownerComment } = body; // 'approved' or 'declined'

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

    approvalRequest.status = status;
    approvalRequest.ownerEmail = user.email;
    approvalRequest.ownerComment = ownerComment;

    if (status === 'approved') {
      if (approvalRequest.type === 'product') {
        const product = await Product.findById(approvalRequest.targetId);
        if (product) {
          if (approvalRequest.field === 'price' || approvalRequest.field === 'stock') {
            if (approvalRequest.variationIndex !== undefined) {
              const varIndex = Number(approvalRequest.variationIndex);
              if (product.variations[varIndex]) {
                  if (approvalRequest.field === 'price') product.variations[varIndex].price = Number(approvalRequest.newValue);
                  if (approvalRequest.field === 'stock') product.variations[varIndex].stock = Number(approvalRequest.newValue);
              }
            } else {
               // Top level field? Not currently used but let's be safe
               (product as any)[approvalRequest.field] = Number(approvalRequest.newValue);
            }
            await product.save();
          }
        }
      } else if (approvalRequest.type === 'order') {
        const order = await Order.findById(approvalRequest.targetId);
        if (order) {
          if (approvalRequest.field === 'status') {
            const oldStatus = order.status;
            const newStatus = approvalRequest.newValue;
            order.status = newStatus;
            
            // Log to order history
            if (!order.orderLogs) order.orderLogs = [];
            order.orderLogs.push({
              fromStatus: oldStatus,
              toStatus: newStatus as any,
              changedBy: `Owner Approved: ${user.email}`,
              reason: `Initiated by ${approvalRequest.requesterEmail}${ownerComment ? `. Owner Comment: ${ownerComment}` : ""}`,
              changedAt: new Date(),
            });
            await order.save();
          }
        }
      }
    } else {
        // Declined - optional: log to order history that it was declined
        if (approvalRequest.type === 'order') {
            const order = await Order.findById(approvalRequest.targetId);
            if (order) {
                if (!order.orderLogs) order.orderLogs = [];
                order.orderLogs.push({
                   fromStatus: approvalRequest.oldValue,
                   toStatus: approvalRequest.newValue as any,
                   changedBy: `Owner Declined: ${user.email}`,
                   reason: `Request by ${approvalRequest.requesterEmail} was declined by the owner${ownerComment ? `: ${ownerComment}` : "."}`,
                   changedAt: new Date(),
                });
                await order.save();
            }
        }
    }

    await approvalRequest.save();

    // Log the approval action
    await logAdminActivity({
      adminEmail: user.email,
      action: `${status}_request`,
      targetId: approvalRequest.targetId,
      targetName: approvalRequest.targetName,
      details: `${status.charAt(0).toUpperCase() + status.slice(1)} ${approvalRequest.type} ${approvalRequest.field} change (from ${approvalRequest.oldValue} to ${approvalRequest.newValue}) requested by ${approvalRequest.requesterEmail}. Owner Comment: ${ownerComment || "none"}`
    });

    return NextResponse.json({ message: `Request ${status} successfully`, request: approvalRequest });
  } catch (error) {
    console.error("Approval process error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
