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

    // Sales Representative can only fetch shops list
    if (isSR && !isAdmin && type !== "shops") {
      return NextResponse.json({ error: "Forbidden: Sales Representatives can only access shop list." }, { status: 403 });
    }

    const responseData: any = {};

    // 1. Outstanding Delivered Orders
    if (type === "all" || type === "orders") {
      const outstandingOrders = await Order.find({
        status: "delivered",
        paymentStatus: { $ne: "paid" }
      }).sort({ createdAt: -1 }).lean();
      
      responseData.orders = outstandingOrders.map((o: any) => ({
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
          { dueBalance: { $gt: 0 } },
          { walletBalance: { $gt: 0 } }
        ]
      })
      .select("name email mobile dueBalance walletBalance creditLimit customerType isRetailerApproved createdAt")
      .sort({ name: 1 })
      .lean();

      responseData.shops = B2BShops.map((s: any) => ({
        ...s,
        id: s._id.toString(),
        _id: undefined
      }));
    }

    // 3. Last 50 entries of the Transaction Ledger
    if (type === "all" || type === "ledgers") {
      const ledgers = await TransactionLedger.find({})
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

      if (order.status !== "delivered") {
        return NextResponse.json({ error: "Only delivered orders can be reconciled." }, { status: 400 });
      }

      const orderUser = await User.findById(order.userId);

      // Increment order payments
      const oldPaid = order.amountPaid || 0;
      const newPaid = oldPaid + cashCollected;
      order.amountPaid = newPaid;
      order.amountDue = Math.max(0, order.total - newPaid);

      if (order.amountDue <= 0) {
        order.paymentStatus = "paid";
      } else {
        order.paymentStatus = "partial";
      }

      order.reconciledBy = operatorName;
      order.reconciledAt = new Date();
      await order.save();

      // Decrement User's Dues
      if (orderUser) {
        const remainingDues = orderUser.dueBalance || 0;
        const netDues = remainingDues - cashCollected;

        if (netDues < 0) {
          // If excess cash collected, credit to wallet
          orderUser.dueBalance = 0;
          orderUser.walletBalance = (orderUser.walletBalance || 0) + Math.abs(netDues);
        } else {
          orderUser.dueBalance = netDues;
        }
        await orderUser.save();
      }

      // Record in Transaction Ledger
      const ledger = new TransactionLedger({
        userId: order.userId || orderUser?._id,
        orderId: order._id,
        amount: cashCollected,
        type: "collection",
        paymentMethod: paymentMethod || "cash",
        recordedBy: adminUser.email,
        notes: notes || `Reconciled order total ৳${order.total} by accounts department.`,
      });
      await ledger.save();

      return NextResponse.json({
        success: true,
        message: `Successfully reconciled ৳${cashCollected} for Order #${order._id.toString().slice(-8).toUpperCase()}`,
        order: {
          id: order._id.toString(),
          paymentStatus: order.paymentStatus,
          amountPaid: order.amountPaid,
          amountDue: order.amountDue
        }
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

      // Check if user has outstanding dues first. If so, apply the deposit to clear outstanding dues!
      let appliedToDues = 0;
      let remainingDeposit = depositAmount;
      const dues = shopUser.dueBalance || 0;

      if (dues > 0) {
        if (remainingDeposit >= dues) {
          appliedToDues = dues;
          shopUser.dueBalance = 0;
          remainingDeposit -= dues;
        } else {
          appliedToDues = remainingDeposit;
          shopUser.dueBalance = dues - remainingDeposit;
          remainingDeposit = 0;
        }
      }

      // Any remaining deposit goes to the wallet balance
      shopUser.walletBalance = (shopUser.walletBalance || 0) + remainingDeposit;
      await shopUser.save();

      // Log in Transaction Ledger
      const ledger = new TransactionLedger({
        userId: shopUser._id,
        amount: depositAmount,
        type: "wallet_deposit",
        paymentMethod: paymentMethod || "cash",
        recordedBy: adminUser.email,
        notes: notes || `Wallet Deposit of ৳${depositAmount} (${appliedToDues > 0 ? `Cleared ৳${appliedToDues} dues` : ""} ${remainingDeposit > 0 ? `Deposited ৳${remainingDeposit} to wallet` : ""}).`,
      });
      await ledger.save();

      return NextResponse.json({
        success: true,
        message: `Successfully deposited ৳${depositAmount} for shop ${shopUser.name}`,
        shop: {
          id: shopUser._id.toString(),
          dueBalance: shopUser.dueBalance,
          walletBalance: shopUser.walletBalance
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
