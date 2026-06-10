import { User, Order, TransactionLedger } from "@/lib/models";
import mongoose from "mongoose";

/**
 * Reconciles the running balance and order dues for a B2B user using FIFO.
 * @param userId The ID of the User (shop/retailer/dealer)
 */
export async function reconcileUserLedger(userId: string) {
  const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;

  // 1. Fetch all orders for this user that are in an active dues state,
  // excluding online payment method since they are self-contained.
  // Sort by createdAt ASC (oldest first) to enforce FIFO oldest-first invoice settlement.
  const rawOrders = await Order.collection.find({
    $or: [{ userId }, { userId: userIdObj }].filter(Boolean) as any,
    status: { $in: ["processing", "shipped", "delivered"] },
    paymentMethod: { $ne: "sslcommerz" }
  }).project({ _id: 1 }).toArray();

  const orderIds = rawOrders.map(o => o._id);

  const activeOrders = await Order.find({
    _id: { $in: orderIds }
  }).sort({ createdAt: 1 });

  // 2. Fetch all transaction ledger entries of type collection and wallet_deposit
  const ledgers = await TransactionLedger.collection.find({
    $or: [{ userId }, { userId: userIdObj }].filter(Boolean) as any,
    type: { $in: ["collection", "wallet_deposit"] }
  }).sort({ createdAt: 1 }).toArray();

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
    await order.save();
  }

  // 4. Update the User's walletBalance
  // walletBalance = totalPaid - total of all active orders
  const totalActiveOrders = activeOrders.reduce((sum, o) => sum + o.total, 0);
  const newWalletBalance = totalPaid - totalActiveOrders;

  let updated = await User.findByIdAndUpdate(userId, {
    $set: { walletBalance: newWalletBalance }
  });
  if (!updated) {
    const { Admin } = await import("@/lib/models");
    await Admin.findByIdAndUpdate(userId, {
      $set: { walletBalance: newWalletBalance }
    });
  }

  return {
    walletBalance: newWalletBalance,
    totalPaid,
    totalActiveOrders
  };
}
