import { User, Order, TransactionLedger, Product, StockLog, ApprovalRequest, Notification } from "@/lib/models";
import mongoose from "mongoose";

/**
 * Reconciles the running balance and order dues for a B2B user using FIFO.
 * Supports running within an existing MongoDB transaction session.
 * 
 * @param userId The ID of the User (shop/retailer/dealer)
 * @param externalSession Optional MongoDB ClientSession for transaction propagation
 */
export async function reconcileUserLedger(userId: string, externalSession?: mongoose.ClientSession) {
  const session = externalSession || await mongoose.startSession();
  const isInternalTransaction = !externalSession;

  if (isInternalTransaction) {
    session.startTransaction();
  }

  try {
    const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;

    // 1. Fetch all orders for this user that are in an active dues state,
    // excluding online payment method since they are self-contained.
    // Sort by createdAt ASC (oldest first) to enforce FIFO oldest-first invoice settlement.
    const rawOrders = await Order.collection.find({
      $or: [{ userId }, { userId: userIdObj }].filter(Boolean) as any,
      status: { $in: ["processing", "shipped", "delivered"] },
      paymentMethod: { $ne: "sslcommerz" }
    }, { session }).project({ _id: 1 }).toArray();

    const orderIds = rawOrders.map(o => o._id);

    const activeOrders = await Order.find({
      _id: { $in: orderIds }
    }, null, { session }).sort({ createdAt: 1 });

    // 2. Fetch all transaction ledger entries of type collection and wallet_deposit
    const ledgers = await TransactionLedger.collection.find({
      $or: [{ userId }, { userId: userIdObj }].filter(Boolean) as any,
      type: { $in: ["collection", "wallet_deposit"] }
    }, { session }).sort({ createdAt: 1 }).toArray();

    const totalPaid = ledgers.reduce((sum, l) => sum + l.amount, 0);

    // 3. Allocate totalPaid across active orders FIFO style
    let remainingPaid = totalPaid;
    for (const order of activeOrders) {
      const orderTotal = order.total;
      if (remainingPaid >= orderTotal) {
        order.amountPaid = orderTotal;
        order.amountDue = 0;
        order.paymentStatus = "paid";
        remainingPaid -= orderTotal;
      } else if (remainingPaid > 0) {
        order.amountPaid = remainingPaid;
        order.amountDue = orderTotal - remainingPaid;
        order.paymentStatus = "partial";
        remainingPaid = 0;
      } else {
        order.amountPaid = 0;
        order.amountDue = orderTotal;
        order.paymentStatus = "pending";
      }
      await order.save({ session });
    }

    // 4. Update the User's walletBalance
    // walletBalance = totalPaid - total of all active orders
    const totalActiveOrders = activeOrders.reduce((sum, o) => sum + o.total, 0);
    const newWalletBalance = totalPaid - totalActiveOrders;

    let updated = await User.findOneAndUpdate(
      { _id: userId },
      { $set: { walletBalance: newWalletBalance } },
      { session, new: true }
    );
    if (!updated) {
      const { Admin } = await import("@/lib/models");
      await Admin.findOneAndUpdate(
        { _id: userId },
        { $set: { walletBalance: newWalletBalance } },
        { session, new: true }
      );
    }

    if (isInternalTransaction) {
      await (session as mongoose.ClientSession).commitTransaction();
    }

    return {
      walletBalance: newWalletBalance,
      totalPaid,
      totalActiveOrders
    };
  } catch (error) {
    if (isInternalTransaction) {
      await (session as mongoose.ClientSession).abortTransaction();
    }
    throw error;
  } finally {
    if (isInternalTransaction) {
      session.endSession();
    }
  }
}

/**
 * Safely cancels an order, resets its payment status, restores stock from hold stock,
 * logs the stock changes, and reconciles the ledger within an optional transaction session.
 */
export async function cancelOrderAndRestoreStock(
  order: any,
  cancelReason: string,
  statusReason: string,
  changedBy: string,
  session?: mongoose.ClientSession
) {
  const oldStatus = order.status;
  if (["cancelled", "lost", "damaged"].includes(oldStatus)) {
    return; // Already in a terminal/restored state
  }

  order.status = "cancelled";
  order.cancelReason = cancelReason;
  order.statusReason = statusReason;

  if (!order.orderLogs) order.orderLogs = [];
  order.orderLogs.push({
    fromStatus: oldStatus,
    toStatus: "cancelled",
    changedBy: changedBy,
    reason: statusReason,
    changedAt: new Date()
  });

  // Reset payment balances as it is cancelled
  order.amountPaid = 0;
  order.amountDue = 0;
  order.paymentStatus = "pending";

  await order.save({ session });

  // Reconcile user ledger if user exists
  if (order.userId) {
    await reconcileUserLedger(order.userId.toString(), session);
  }

  // Restore stock for all items
  for (const item of order.items) {
    if (item.productId) {
      const product = await Product.findById(item.productId).session(session || null);
      if (product && product.variations) {
        const varIndex = product.variations.findIndex((v: any) => {
          const weightMatch = (!item.weight && !v.weight) || (item.weight === v.weight);
          const flavorMatch = (!item.flavor && !v.flavor) || (item.flavor === v.flavor);
          return weightMatch && flavorMatch;
        });

        if (varIndex !== -1) {
          const variation = product.variations[varIndex];
          const holdField = `variations.${varIndex}.holdStock`;
          const stockField = `variations.${varIndex}.stock`;

          const update: any = {
            $inc: {
              [holdField]: -item.quantity,
              [stockField]: item.quantity
            }
          };

          await StockLog.create([{
            productId: product._id,
            productName: product.name,
            variationIndex: varIndex,
            weight: item.weight,
            flavor: item.flavor,
            oldStock: variation.stock || 0,
            newStock: (variation.stock || 0) + item.quantity,
            amount: item.quantity,
            reason: `System Auto-Cancelled (${cancelReason}) - Order #${order._id.toString().slice(-8).toUpperCase()}`,
            adminEmail: changedBy,
          }], { session });

          await Product.updateOne({ _id: product._id }, update, { session });
        }
      }
    }
  }
}

/**
 * Runs passive background tasks to cancel expired online payments and SR negotiated discounts.
 */
export async function runBackgroundCleanups() {
  const now = new Date();

  // 1. Clean up unpaid online (sslcommerz) orders older than 30 minutes
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const expiredOnlineOrders = await Order.find({
    paymentMethod: "sslcommerz",
    paymentStatus: { $ne: "paid" },
    status: { $nin: ["cancelled", "lost", "damaged", "delivered"] },
    createdAt: { $lt: thirtyMinutesAgo }
  });

  for (const ord of expiredOnlineOrders) {
    try {
      await cancelOrderAndRestoreStock(
        ord,
        "Payment timeout",
        "Payment timeout: Unpaid order cancelled automatically after 30 minutes.",
        "system"
      );
    } catch (err) {
      console.error(`Failed to auto-cancel order ${ord._id} on payment timeout:`, err);
    }
  }

  // 2. Clean up pending SR negotiated discount approvals older than 24 hours
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const expiredApprovals = await ApprovalRequest.find({
    type: "order",
    field: "srDiscount",
    status: "pending",
    createdAt: { $lt: twentyFourHoursAgo }
  });

  for (const req of expiredApprovals) {
    try {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        req.status = "declined";
        req.declinedBy = "system";
        if (!req.comments) req.comments = [];
        req.comments.push({
          user: "system",
          text: "Auto-expired: Negotiated discount approval request was not approved within 24 hours.",
          date: new Date()
        });
        await req.save({ session });

        const order = await Order.findById(req.targetId).session(session);
        if (order) {
          await cancelOrderAndRestoreStock(
            order,
            "Negotiated discount declined by Superadmin",
            "Auto-expired: Negotiated discount approval request was not approved within 24 hours.",
            "system",
            session
          );

          // Notify Requester (SR)
          await Notification.create([{
            userId: req.requesterEmail,
            title: "Request Declined (Expired)",
            message: `Your change request for ${req.targetName} was declined during the Initial Verification Phase. Reason: Auto-expired after 24 hours without approval.`,
            type: "alert",
            targetLink: `/admin/orders`
          }], { session });
        }

        await session.commitTransaction();

        // Send Telegram notification outside transaction
        try {
          const { notifyApprovalFinalized } = await import("@/lib/telegram");
          await notifyApprovalFinalized(req);
        } catch (tgError) {
          console.error("Telegram notification failed for expired approval:", tgError);
        }
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        session.endSession();
      }
    } catch (err) {
      console.error(`Failed to auto-expire approval request ${req._id}:`, err);
    }
  }
}
