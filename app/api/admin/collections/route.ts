import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUser, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Order, User, TransactionLedger } from "@/lib/models";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// GET handler returns outstanding delivered orders, shop profiles with dues, and ledger history
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getVerifiedAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Load full user details to check isSR
    const dbUser = await User.findById(user.id).lean() as any;
    const isSR = dbUser ? dbUser.isSR : false;

    const isAdmin = [ROLES.OWNER, ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR].includes(user.role as any);
    if (!isAdmin && !isSR) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (type === "payment-history") {
      const orderId = searchParams.get("orderId");
      if (!orderId) {
        return NextResponse.json({ error: "orderId is required" }, { status: 400 });
      }

      const order = await Order.findById(orderId).lean() as any;
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      // B2C / Guest orders check: only direct collections are logged against the orderId
      if (!order.userId) {
        const directLedgers = await TransactionLedger.find({ orderId }).sort({ createdAt: 1 }).lean();
        const history = directLedgers.map((l: any) => ({
          id: l._id.toString(),
          amount: l.amount,
          label: "Collected Cash",
          paymentMethod: l.paymentMethod,
          recordedBy: l.recordedBy,
          notes: l.notes,
          createdAt: l.createdAt
        }));
        return NextResponse.json({
          orderId,
          orderTotal: order.total,
          history,
          due: Math.max(0, order.total - directLedgers.reduce((sum, l) => sum + l.amount, 0))
        });
      }

      // B2B Customer FIFO audit trail
      const userId = order.userId;
      const activeOrders = await Order.find({
        userId,
        status: { $in: ["processing", "shipped", "delivered"] },
        paymentMethod: { $ne: "sslcommerz" }
      }).sort({ createdAt: 1 }).lean() as any[];

      const hasTarget = activeOrders.some(o => o._id.toString() === orderId);
      if (!hasTarget) {
        const directLedgers = await TransactionLedger.find({ orderId }).sort({ createdAt: 1 }).lean();
        const history = directLedgers.map((l: any) => ({
          id: l._id.toString(),
          amount: l.amount,
          label: "Collected Cash",
          paymentMethod: l.paymentMethod,
          recordedBy: l.recordedBy,
          notes: l.notes,
          createdAt: l.createdAt
        }));
        return NextResponse.json({
          orderId,
          orderTotal: order.total,
          history,
          due: order.amountDue ?? order.total
        });
      }

      const ledgers = await TransactionLedger.find({
        userId,
        type: { $in: ["collection", "wallet_deposit"] }
      }).sort({ createdAt: 1 }).lean() as any[];

      // FIFO Simulator to construct the allocations timeline
      let remainingPaid = ledgers.map(l => ({ ...l, remaining: l.amount }));
      const history: any[] = [];
      let orderDueAfterAlloc = order.total;

      for (const currentOrder of activeOrders) {
        const isTarget = currentOrder._id.toString() === orderId;
        let orderNeeded = currentOrder.total;

        for (const p of remainingPaid) {
          if (p.remaining <= 0) continue;

          // Determine the correct descriptive audit label matching user terminology
          let label = "Collected Cash";
          if (new Date(p.createdAt) < new Date(currentOrder.createdAt)) {
            label = "Previous Balance / Advance Adjustment";
          } else if (p.type === "wallet_deposit") {
            label = "Account Balance Adjustment";
          }

          if (p.remaining >= orderNeeded) {
            if (isTarget) {
              history.push({
                id: p._id.toString(),
                amount: orderNeeded,
                label,
                paymentMethod: p.paymentMethod,
                recordedBy: p.recordedBy,
                notes: p.notes,
                createdAt: p.createdAt
              });
            }
            p.remaining -= orderNeeded;
            orderNeeded = 0;
            break; // currentOrder fully settled
          } else {
            if (isTarget) {
              history.push({
                id: p._id.toString(),
                amount: p.remaining,
                label,
                paymentMethod: p.paymentMethod,
                recordedBy: p.recordedBy,
                notes: p.notes,
                createdAt: p.createdAt
              });
            }
            orderNeeded -= p.remaining;
            p.remaining = 0;
          }
        }

        if (isTarget) {
          orderDueAfterAlloc = orderNeeded;
          break; // Simulation completed up to the target order
        }
      }

      return NextResponse.json({
        orderId,
        orderTotal: order.total,
        history,
        due: orderDueAfterAlloc
      });
    }

    // Sales Representative can only fetch shops list
    if (isSR && !isAdmin && type !== "shops") {
      return NextResponse.json({ error: "Forbidden: Sales Representatives can only access shop list." }, { status: 403 });
    }

    const responseData: any = {};

    // 1. Outstanding Orders (Processing, Shipped, Delivered)
    if (type === "all" || type === "orders") {
      const queryCond: any = {
        status: { $in: ["processing", "shipped", "delivered"] },
        paymentStatus: { $ne: "paid" }
      };
      if (startDate || endDate) {
        queryCond.createdAt = {};
        if (startDate) queryCond.createdAt.$gte = new Date(startDate);
        if (endDate) queryCond.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
      }
      const outstandingOrders = await Order.find(queryCond).sort({ createdAt: -1 }).lean();
      
      responseData.orders = outstandingOrders.map((o: any) => ({
        ...o,
        id: o._id.toString(),
        _id: undefined
      }));
    }

    // 1b. Completed Invoices (Processing, Shipped, Delivered, paymentStatus === "paid")
    if (type === "all" || type === "completed") {
      const queryCond: any = {
        status: { $in: ["processing", "shipped", "delivered"] },
        paymentStatus: "paid"
      };
      if (startDate || endDate) {
        queryCond.createdAt = {};
        if (startDate) queryCond.createdAt.$gte = new Date(startDate);
        if (endDate) queryCond.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
      }
      const completedOrders = await Order.find(queryCond).sort({ createdAt: -1 }).lean();
      
      responseData.completedOrders = completedOrders.map((o: any) => ({
        ...o,
        id: o._id.toString(),
        _id: undefined
      }));
    }

    // 2. Shops / Retailers / Dealers with outstanding dues or wallet balances
    if (type === "all" || type === "shops") {
      // Find all customers or retailers or users with non-zero balances
      const B2BShops = await User.find({
        $or: [
          { role: "customer" },
          { walletBalance: { $ne: 0 } }
        ]
      })
      .select("name email mobile walletBalance creditLimit customerType isSR isRetailerApproved createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .lean();

      responseData.shops = B2BShops.map((s: any) => {
        const bal = s.walletBalance || 0;
        return {
          ...s,
          id: s._id.toString(),
          _id: undefined,
          dueBalance: bal < 0 ? Math.abs(bal) : 0,
          walletBalance: bal > 0 ? bal : 0
        };
      });
    }

    // 3. Last 50 entries of the Transaction Ledger
    if (type === "all" || type === "ledgers") {
      const queryCond: any = {};
      if (startDate || endDate) {
        queryCond.createdAt = {};
        if (startDate) queryCond.createdAt.$gte = new Date(startDate);
        if (endDate) queryCond.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
      }
      const ledgers = await TransactionLedger.find(queryCond)
        .populate("userId", "name email mobile customerType")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      responseData.ledgers = ledgers.map((l: any) => ({
        ...l,
        id: l._id.toString(),
        _id: undefined,
        userId: l.userId ? {
          ...l.userId,
          id: l.userId._id?.toString(),
          _id: undefined
        } : null
      }));
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Collections GET error:", error);
    return NextResponse.json({ error: "Internal server error: " + (error.message || "Unknown error") }, { status: 500 });
  }
}

// POST handler processes reconciliations, wallet deposits, and retailer approvals
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const adminUser = await getVerifiedAuthUser(request);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAuthorized = [ROLES.OWNER, ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR].includes(adminUser.role as any);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions." }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    const operatorName = adminUser.name || adminUser.email;

    // A. Reconcile an outstanding order payment
    if (action === "reconcile") {
      const { orderId, amountPaid, paymentMethod, notes } = body;
      const cashCollected = Number(amountPaid || 0);

      if (!orderId || cashCollected <= 0) {
        return NextResponse.json({ error: "Order ID and positive collection amount are required." }, { status: 400 });
      }

      const order = await Order.findById(orderId);
      if (!order) {
        return NextResponse.json({ error: "Order not found." }, { status: 404 });
      }

      if (!["processing", "shipped", "delivered"].includes(order.status)) {
        return NextResponse.json({ error: "Only processing, shipped, or delivered orders can be reconciled." }, { status: 400 });
      }

      const orderUser = order.userId ? await User.findById(order.userId) : null;
      
      const isB2B = order.customerType === "retailer" || order.customerType === "dealer" || 
                    (orderUser && (orderUser.customerType === "retailer" || orderUser.customerType === "dealer"));

      if (isB2B) {
        // Record in Transaction Ledger
        const ledger = new TransactionLedger({
          userId: order.userId || orderUser?._id,
          orderId: order._id,
          amount: cashCollected,
          type: "collection",
          paymentMethod: paymentMethod || "cash",
          recordedBy: adminUser.email,
          notes: notes || `Reconciled B2B payment of ৳${cashCollected} by accounts department.`,
        });
        await ledger.save();

        // Reconcile user ledger using FIFO
        const { reconcileUserLedger } = await import("@/lib/ledger");
        if (order.userId) {
          await reconcileUserLedger(order.userId.toString());
        } else {
          order.amountPaid = (order.amountPaid || 0) + cashCollected;
          order.amountDue = Math.max(0, order.total - order.amountPaid);
          order.paymentStatus = order.amountDue <= 0 ? "paid" : "partial";
          await order.save();
        }
      } else {
        // B2C / Guest order - direct update on order dues
        order.amountPaid = (order.amountPaid || 0) + cashCollected;
        order.amountDue = Math.max(0, order.total - order.amountPaid);
        order.paymentStatus = order.amountDue <= 0 ? "paid" : "partial";
        await order.save();

        // Save ledger entry if we have a userId for tracking
        if (order.userId || orderUser?._id) {
          const ledger = new TransactionLedger({
            userId: order.userId || orderUser?._id,
            orderId: order._id,
            amount: cashCollected,
            type: "collection",
            paymentMethod: paymentMethod || "cash",
            recordedBy: adminUser.email,
            notes: notes || `Reconciled B2C payment of ৳${cashCollected} by accounts department.`,
          });
          await ledger.save();
        }
      }

      const updatedOrder = await Order.findById(orderId).lean() as any;

      return NextResponse.json({
        success: true,
        message: `Successfully processed payment of ৳${cashCollected} for ${orderUser ? 'shop ' + orderUser.name : 'order #' + orderId.slice(-8).toUpperCase()}`,
        order: updatedOrder ? {
          id: updatedOrder._id.toString(),
          paymentStatus: updatedOrder.paymentStatus,
          amountPaid: updatedOrder.amountPaid,
          amountDue: updatedOrder.amountDue
        } : null
      });
    }

    // B. Direct Wallet Deposit (Advance payment)
    if (action === "wallet-deposit") {
      const { userId, amount, paymentMethod, notes } = body;
      const depositAmount = Number(amount || 0);

      if (!userId || depositAmount <= 0) {
        return NextResponse.json({ error: "User ID and positive deposit amount are required." }, { status: 400 });
      }

      const shopUser = await User.findById(userId);
      if (!shopUser) {
        return NextResponse.json({ error: "User profile not found." }, { status: 404 });
      }

      // Log in Transaction Ledger
      const ledger = new TransactionLedger({
        userId: shopUser._id,
        amount: depositAmount,
        type: "wallet_deposit",
        paymentMethod: paymentMethod || "cash",
        recordedBy: adminUser.email,
        notes: notes || `Wallet Deposit of ৳${depositAmount}.`,
      });
      await ledger.save();

      // Reconcile user ledger using FIFO
      const { reconcileUserLedger } = await import("@/lib/ledger");
      const { walletBalance } = await reconcileUserLedger(userId);

      return NextResponse.json({
        success: true,
        message: `Successfully deposited ৳${depositAmount} for shop ${shopUser.name}`,
        shop: {
          id: shopUser._id.toString(),
          dueBalance: walletBalance < 0 ? Math.abs(walletBalance) : 0,
          walletBalance: walletBalance > 0 ? walletBalance : 0
        }
      });
    }

    // C. Approve Retailer / Lift Probation Limit
    if (action === "approve-retailer") {
      const { userId } = body;
      if (!userId) {
        return NextResponse.json({ error: "User ID is required." }, { status: 400 });
      }

      const shopUser = await User.findById(userId);
      if (!shopUser) {
        return NextResponse.json({ error: "Shop user not found." }, { status: 404 });
      }

      shopUser.isRetailerApproved = true;
      // Also elevate their credit limit upon approval
      shopUser.creditLimit = 50000; // default standard retailer limit after approval
      await shopUser.save();

      return NextResponse.json({
        success: true,
        message: `Successfully approved retailer ${shopUser.name} and raised credit limit to ৳50,000.`,
        shop: {
          id: shopUser._id.toString(),
          isRetailerApproved: shopUser.isRetailerApproved,
          creditLimit: shopUser.creditLimit
        }
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Collections POST error:", error);
    return NextResponse.json({ error: "Internal server error: " + (error.message || "Unknown error") }, { status: 500 });
  }
}
