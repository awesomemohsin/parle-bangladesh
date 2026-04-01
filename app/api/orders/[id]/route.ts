import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ORDER_STATUS, ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models";
import { logAdminActivity } from "@/lib/activity";

function mapDoc(doc: any) {
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
}

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAnyRole(user, [ROLES.MODERATOR, ROLES.ADMIN, ROLES.SUPER_ADMIN])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const { ApprovalRequest } = require("@/lib/models");
    const pendingRequests = await ApprovalRequest.find({ 
      targetId: id,
      status: "pending" 
    });

    return NextResponse.json({ 
      order: { 
        ...mapDoc(order), 
        pendingApproval: pendingRequests.length > 0 
      } 
    });
  } catch (error) {
    console.error("Order GET by id error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role === ROLES.OWNER) {
       return NextResponse.json({ error: "Restricted: Owner cannot update directly. Use the Approval system." }, { status: 403 });
    }

    if (!hasAnyRole(user, [ROLES.MODERATOR, ROLES.ADMIN, ROLES.SUPER_ADMIN])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const newStatus = String(body.status || "").toLowerCase();
    const statusReason = body.statusReason || body.cancelReason;

    if (!Object.values(ORDER_STATUS).includes(newStatus as never)) {
      return NextResponse.json(
        { error: "Invalid order status" },
        { status: 400 },
      );
    }

    const { id } = await params;
    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const oldStatus = order.status;

    // Check if permission required from Owner (for damaged and lost)
    const requiresApproval = [ORDER_STATUS.DAMAGED, ORDER_STATUS.LOST].includes(newStatus as any);
    const isOwner = user.role === ROLES.OWNER;

    if (requiresApproval && !isOwner) {
       // Create approval request instead of updating order
       const { ApprovalRequest } = require("@/lib/models");
       const approvalRequest = new ApprovalRequest({
         requesterEmail: user.email,
         type: "order",
         targetId: order._id.toString(),
         targetName: `Order #${order._id.toString().slice(-6)}`,
         field: "status",
         oldValue: oldStatus,
         newValue: newStatus,
         status: "pending",
       });
       await approvalRequest.save();

       // Log to order history that it's waiting for approval
       if (!order.orderLogs) order.orderLogs = [];
       order.orderLogs.push({
         fromStatus: oldStatus,
         toStatus: `${newStatus} (Waiting for Approval)`,
         changedBy: user.email,
         reason: `Admin requested change to ${newStatus}. Reason: ${statusReason || 'Not provided'}`,
         changedAt: new Date()
       });
       await order.save();

       return NextResponse.json({ 
         message: "This status change requires OWNER approval and has been queued.",
         pendingApproval: true,
         order: { ...mapDoc(order), pendingApproval: true }
       });
    }
    
    // Update order
    order.status = newStatus;
    const reasonRequiredStatuses = [ORDER_STATUS.CANCELLED, ORDER_STATUS.DAMAGED, ORDER_STATUS.LOST];
    
    if (reasonRequiredStatuses.includes(newStatus as any)) {
      if (statusReason) {
        order.statusReason = statusReason;
        if (newStatus === ORDER_STATUS.CANCELLED) {
          order.cancelReason = statusReason;
        }
      }
    } else {
      // Clear reasons if moving to a status that doesn't require them
      order.statusReason = undefined;
      order.cancelReason = undefined;
    }

    // Add log to order document
    if (!order.orderLogs) order.orderLogs = [];
    order.orderLogs.push({
      fromStatus: oldStatus,
      toStatus: newStatus,
      changedBy: `${user.name || 'Admin'} (${user.email})`,
      reason: statusReason,
      changedAt: new Date(),
    });

    await order.save();

    // Log administrative activity globally
    await logAdminActivity({
      adminEmail: user.email,
      action: "update_order_status",
      targetId: order._id.toString(),
      targetName: `Order #${order._id.toString().slice(-6)}`,
      details: `Updated order ${order._id} status from ${oldStatus} to ${newStatus}${statusReason ? ` (Reason: ${statusReason})` : ''}`
    });

    return NextResponse.json({ order: mapDoc(order) });
  } catch (error) {
    console.error("Order PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
