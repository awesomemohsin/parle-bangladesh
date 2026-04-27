import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ORDER_STATUS, ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Order, Product } from "@/lib/models";
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
    const { Notification } = require("@/lib/models");

    // IMMUTABILITY CONSTRAINTS
    // Prevent any changes once an order has hit a 'terminal' state
    const terminalStatuses = [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED, ORDER_STATUS.DAMAGED, ORDER_STATUS.LOST];
    if (terminalStatuses.includes(oldStatus as any)) {
       return NextResponse.json({ 
         error: `This order is already marked as ${oldStatus.toUpperCase()} and cannot be modified again. Status is final.` 
       }, { status: 400 });
    }

    // ROLE-BASED CONSTRAINTS
    // 1. Moderator can only change status from processing onwards
    if (user.role === ROLES.MODERATOR) {
      if (oldStatus === ORDER_STATUS.PENDING) {
        return NextResponse.json({ error: "Moderators cannot modify pending orders. Please wait for Admin processing." }, { status: 403 });
      }
      if (newStatus === ORDER_STATUS.PENDING) {
        return NextResponse.json({ error: "Moderators cannot revert orders to pending status." }, { status: 403 });
      }
    }

    // 2. No role can revert to pending after processing started
    if (newStatus === ORDER_STATUS.PENDING && oldStatus !== ORDER_STATUS.PENDING) {
       return NextResponse.json({ error: "Orders cannot be reverted to pending status once processing has begun." }, { status: 400 });
    }

    // Check if permission required from Owner (for damaged and lost)
    const requiresApproval = [ORDER_STATUS.DAMAGED, ORDER_STATUS.LOST].includes(newStatus as any);

    if (requiresApproval) {
       // Create approval request instead of updating order
       const { ApprovalRequest } = require("@/lib/models");
       const approvalRequest = new ApprovalRequest({
         requesterEmail: user.email,
         type: "order",
         targetId: order._id.toString(),
         targetName: `Order #${order._id.toString().slice(-8).toUpperCase()}`,
         field: "status",
         oldValue: oldStatus,
         newValue: newStatus,
         status: "pending",
         targetDetails: order.toObject(),
         stage: "superadmin",
       });
       await approvalRequest.save();

       // Notify Superadmins of new pending approval
       await Notification.create({
         role: ROLES.SUPER_ADMIN,
         title: "New Order Approval Req",
         message: `Approval required for Order #${order._id.toString().slice(-8).toUpperCase()} status change to ${newStatus}`,
         type: "approval",
         targetLink: `/admin/approvals/orders`
       });

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
    
    // --- STOCK MANAGEMENT LOGIC ---
    // If transitioning from a 'holding' state (pending/processing/shipped) to a 'terminal' state
    const holdingStatuses = [ORDER_STATUS.PENDING, ORDER_STATUS.PROCESSING, ORDER_STATUS.SHIPPED];
    const isFromHolding = holdingStatuses.includes(oldStatus as any);

    if (isFromHolding) {
      if (newStatus === ORDER_STATUS.DELIVERED) {
        // Delivered: Release hold, subtract from physical stock, add to delivered count
        for (const item of order.items) {
          const product = await Product.findOne({ slug: item.productSlug });
          if (product && product.variations) {
            const varIndex = product.variations.findIndex((v: any) => {
              const weightMatch = (!item.weight && !v.weight) || (item.weight === v.weight);
              const flavorMatch = (!item.flavor && !v.flavor) || (item.flavor === v.flavor);
              return weightMatch && flavorMatch;
            });
            if (varIndex !== -1) {
              const qty = item.quantity;
              const update: any = { $inc: {} };
              // Stock was already reduced at order time
              // We only clear the hold now
              update.$inc[`variations.${varIndex}.holdStock`] = -qty;
              update.$inc[`variations.${varIndex}.deliveredCount`] = qty;
              await Product.updateOne({ _id: product._id }, update);
            }
          }
        }
      } else if (newStatus === ORDER_STATUS.CANCELLED) {
        // Cancelled: Return stock from hold to available pool
        for (const item of order.items) {
          const product = await Product.findOne({ slug: item.productSlug });
          if (product && product.variations) {
            const varIndex = product.variations.findIndex((v: any) => {
              const weightMatch = (!item.weight && !v.weight) || (item.weight === v.weight);
              const flavorMatch = (!item.flavor && !v.flavor) || (item.flavor === v.flavor);
              return weightMatch && flavorMatch;
            });
            if (varIndex !== -1) {
               await Product.updateOne(
                 { _id: product._id },
                 { $inc: { 
                   [`variations.${varIndex}.holdStock`]: -item.quantity,
                   [`variations.${varIndex}.stock`]: item.quantity
                 } }
               );
            }
          }
        }
      } else if (newStatus === ORDER_STATUS.DAMAGED || newStatus === ORDER_STATUS.LOST) {
          // Damaged/Lost: Just release the hold. Stock was already deducted at checkout.
          for (const item of order.items) {
            const product = await Product.findOne({ slug: item.productSlug });
            if (product && product.variations) {
              const varIndex = product.variations.findIndex((v: any) => {
                const weightMatch = (!item.weight && !v.weight) || (item.weight === v.weight);
                const flavorMatch = (!item.flavor && !v.flavor) || (item.flavor === v.flavor);
                return weightMatch && flavorMatch;
              });
              if (varIndex !== -1) {
                const qty = item.quantity;
                const update: any = { $inc: {} };
                update.$inc[`variations.${varIndex}.holdStock`] = -qty;
                if (newStatus === ORDER_STATUS.DAMAGED) update.$inc[`variations.${varIndex}.damagedCount`] = qty;
                if (newStatus === ORDER_STATUS.LOST) update.$inc[`variations.${varIndex}.lostCount`] = qty;
                await Product.updateOne({ _id: product._id }, update);
              }
            }
          }
      }
    }

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

    // TRIGGER NOTIFICATIONS FOR ROLE HAND-OFF
    if (newStatus === ORDER_STATUS.PROCESSING && oldStatus !== ORDER_STATUS.PROCESSING) {
      await Notification.create({
        role: ROLES.MODERATOR,
        title: "Order Ready for Dispatch",
        message: `Order #${order._id.toString().slice(-8).toUpperCase()} has been processed and is ready for status management.`,
        type: "order",
        targetLink: `/admin/orders`
      });
    } else if (newStatus !== ORDER_STATUS.PROCESSING && newStatus !== oldStatus) {
      // Notify Admin of status updates (Shipped, Delivered, Cancelled, etc)
      await Notification.create({
        role: ROLES.ADMIN,
        title: "Order Status Updated",
        message: `Order #${order._id.toString().slice(-8).toUpperCase()} status changed from ${oldStatus} to ${newStatus}.`,
        type: "order",
        targetLink: `/admin/orders`
      });
    }

    // Log administrative activity globally
    await logAdminActivity({
      adminEmail: user.email,
      action: "update_order_status",
      targetId: order._id.toString(),
      targetName: `Order #${order._id.toString().slice(-8).toUpperCase()}`,
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
