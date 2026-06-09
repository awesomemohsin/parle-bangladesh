import { User, Order, TransactionLedger } from "@/lib/models";

/**
 * Reconciles the running balance and order dues for a B2B user using FIFO.
 * @param userId The ID of the User (shop/retailer/dealer)
 */
export async function reconcileUserLedger(userId: string) {
  // 1. Fetch all orders for this user that are in an active dues state,
  // excluding online payment method since they are self-contained.
  // Sort by createdAt ASC (oldest first) to enforce FIFO oldest-first invoice settlement.
  const activeOrders = await Order.find({
    userId,
    status: { $in: ["processing", "shipped", "delivered"] },
    paymentMethod: { $ne: "sslcommerz" }
  }).sort({ createdAt: 1 });

  // 2. Fetch all transaction ledger entries of type collection and wallet_deposit
  const ledgers = await TransactionLedger.find({
    userId,
    type: { $in: ["collection", "wallet_deposit"] }
  }).sort({ createdAt: 1 });

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

  await User.findByIdAndUpdate(userId, {
    $set: { walletBalance: newWalletBalance }
  });

  return {
    walletBalance: newWalletBalance,
    totalPaid,
    totalActiveOrders
  };
}
