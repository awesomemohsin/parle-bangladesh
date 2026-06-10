import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUser, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Order, User, TransactionLedger, Admin } from "@/lib/models";
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

    if (type === "customer-details") {
      const customerId = searchParams.get("customerId");
      const customerMobile = searchParams.get("customerMobile");

      if (!customerId && !customerMobile) {
        return NextResponse.json({ error: "customerId or customerMobile is required" }, { status: 400 });
      }

      // Fetch user info
      let dbUser: any = null;
      if (customerId && !customerId.startsWith("guest-") && mongoose.Types.ObjectId.isValid(customerId)) {
        dbUser = await User.findById(customerId).populate("referredBySR", "name email mobile").lean();
        if (!dbUser) {
          dbUser = await Admin.findById(customerId).lean();
        }
      }

      // Fetch all orders for this customer (sorted by createdAt desc)
      const queryCond: any = {};
      if (dbUser) {
        queryCond.userId = dbUser._id;
      } else {
        const phone = customerMobile || (customerId?.startsWith("guest-") ? customerId.replace("guest-", "") : customerId);
        queryCond.customerPhone = phone;
      }
      queryCond.status = { $in: ["processing", "shipped", "delivered"] };

      const allOrders = await Order.find(queryCond).sort({ createdAt: -1 }).lean();

      // Fetch all payment/transaction history for this customer (sorted by createdAt desc)
      let allPayments: any[] = [];
      if (dbUser) {
        allPayments = await TransactionLedger.find({
          userId: dbUser._id
        }).sort({ createdAt: -1 }).lean();
      } else {
        // For guest, transactions are recorded against the orderIds of their orders
        const orderIds = allOrders.map(o => o._id);
        allPayments = await TransactionLedger.find({
          orderId: { $in: orderIds }
        }).sort({ createdAt: -1 }).lean();
      }

      return NextResponse.json({
        user: dbUser ? {
          id: dbUser._id.toString(),
          name: dbUser.name,
          mobile: dbUser.mobile,
          email: dbUser.email,
          customerType: dbUser.customerType || dbUser.role,
          walletBalance: dbUser.walletBalance || 0,
          creditLimit: dbUser.creditLimit || 0,
          isRetailerApproved: dbUser.isRetailerApproved ?? true,
          createdAt: dbUser.createdAt,
          referredBySR: dbUser.referredBySR || null
        } : {
          id: customerId,
          name: allOrders[0]?.customerName || "Guest Customer",
          mobile: customerMobile || (customerId?.startsWith("guest-") ? customerId.replace("guest-", "") : customerId),
          email: allOrders[0]?.customerEmail || "",
          customerType: "Guest",
          walletBalance: 0,
          creditLimit: 0,
          isRetailerApproved: false,
          createdAt: allOrders[allOrders.length - 1]?.createdAt || new Date(),
          referredBySR: null
        },
        orders: allOrders.map((o: any) => ({
          id: o._id.toString(),
          total: o.total,
          amountPaid: o.amountPaid,
          amountDue: o.amountDue,
          paymentMethod: o.paymentMethod,
          paymentStatus: o.paymentStatus,
          status: o.status,
          address: `${o.address}, ${o.city} - ${o.postalCode}`,
          createdAt: o.createdAt
        })),
        payments: allPayments.map((p: any) => ({
          id: p._id.toString(),
          amount: p.amount,
          type: p.type,
          paymentMethod: p.paymentMethod,
          notes: p.notes,
          documentUrl: p.documentUrl,
          recordedBy: p.recordedBy,
          createdAt: p.createdAt
        }))
      });
    }

    if (type === "payment-history") {
      const orderId = searchParams.get("orderId");
      if (!orderId) {
        return NextResponse.json({ error: "orderId is required" }, { status: 400 });
      }

      const order = await Order.findById(orderId).lean() as any;
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      // Guest orders only show direct collections logged against the orderId.
      // Registered users (B2B, customers, admins) use FIFO ledger reconciliation.
      const isRegistered = !!order.userId;
      if (!isRegistered) {
        const directLedgers = await TransactionLedger.find({ orderId }).sort({ createdAt: 1 }).lean();
        const history = directLedgers.map((l: any) => ({
          id: l._id.toString(),
          amount: l.amount,
          label: "Collected Payment",
          paymentMethod: l.paymentMethod,
          recordedBy: l.recordedBy,
          notes: l.notes,
          documentUrl: l.documentUrl,
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
          label: "Collected Payment",
          paymentMethod: l.paymentMethod,
          recordedBy: l.recordedBy,
          notes: l.notes,
          documentUrl: l.documentUrl,
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
          let label = "Collected Payment";
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
                documentUrl: p.documentUrl,
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
                documentUrl: p.documentUrl,
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
      
      // Bulk resolve user types (including admins)
      const orderUserIds = Array.from(new Set(outstandingOrders.map((o: any) => o.userId).filter(Boolean)));
      const [dbUsers, dbAdmins] = await Promise.all([
        User.find({ _id: { $in: orderUserIds } }).select("customerType role").lean(),
        Admin.find({ _id: { $in: orderUserIds } }).select("role").lean()
      ]);
      const orderUserMap: Record<string, string> = {};
      dbUsers.forEach((u: any) => {
        orderUserMap[u._id.toString()] = u.customerType || u.role || "customer";
      });
      dbAdmins.forEach((a: any) => {
        orderUserMap[a._id.toString()] = a.role || "admin";
      });

      responseData.orders = outstandingOrders.map((o: any) => {
        const resolvedType = o.userId 
          ? (orderUserMap[o.userId.toString()] || o.customerType || "customer") 
          : "guest";
        return {
          ...o,
          customerType: resolvedType,
          id: o._id.toString(),
          _id: undefined
        };
      });
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
      
      // Bulk resolve user types (including admins)
      const orderUserIds = Array.from(new Set(completedOrders.map((o: any) => o.userId).filter(Boolean)));
      const [dbUsers, dbAdmins] = await Promise.all([
        User.find({ _id: { $in: orderUserIds } }).select("customerType role").lean(),
        Admin.find({ _id: { $in: orderUserIds } }).select("role").lean()
      ]);
      const orderUserMap: Record<string, string> = {};
      dbUsers.forEach((u: any) => {
        orderUserMap[u._id.toString()] = u.customerType || u.role || "customer";
      });
      dbAdmins.forEach((a: any) => {
        orderUserMap[a._id.toString()] = a.role || "admin";
      });

      responseData.completedOrders = completedOrders.map((o: any) => {
        const resolvedType = o.userId 
          ? (orderUserMap[o.userId.toString()] || o.customerType || "customer") 
          : "guest";
        return {
          ...o,
          customerType: resolvedType,
          id: o._id.toString(),
          _id: undefined
        };
      });
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

      // Aggregate order statistics for users
      const orderStats = await Order.aggregate([
        {
          $match: {
            userId: { $nin: [null, ""], $exists: true },
            status: { $in: ["processing", "shipped", "delivered"] }
          }
        },
        {
          $group: {
            _id: "$userId",
            totalOrderAmount: { $sum: "$total" },
            totalPaidAmount: { $sum: "$amountPaid" },
            totalDueAmount: { $sum: "$amountDue" }
          }
        }
      ]);

      const statsMap: Record<string, { totalOrderAmount: number; totalPaidAmount: number; totalDueAmount: number }> = {};
      orderStats.forEach((stat: any) => {
        if (stat._id) {
          statsMap[stat._id.toString()] = {
            totalOrderAmount: stat.totalOrderAmount || 0,
            totalPaidAmount: stat.totalPaidAmount || 0,
            totalDueAmount: stat.totalDueAmount || 0
          };
        }
      });

      const registeredShops = B2BShops.map((s: any) => {
        const bal = s.walletBalance || 0;
        const stats = statsMap[s._id.toString()] || { totalOrderAmount: 0, totalPaidAmount: 0, totalDueAmount: 0 };
        return {
          ...s,
          id: s._id.toString(),
          _id: undefined,
          dueBalance: bal < 0 ? Math.abs(bal) : 0,
          walletBalance: bal > 0 ? bal : 0,
          totalOrderAmount: stats.totalOrderAmount,
          totalPaidAmount: stats.totalPaidAmount,
          totalDueAmount: stats.totalDueAmount
        };
      });

      // Aggregate guest checkout orders (where userId is missing/null/empty)
      const guestOrderStats = await Order.aggregate([
        {
          $match: {
            $or: [
              { userId: { $exists: false } },
              { userId: null },
              { userId: "" }
            ],
            status: { $in: ["processing", "shipped", "delivered"] }
          }
        },
        {
          $group: {
            _id: "$customerPhone",
            name: { $first: "$customerName" },
            email: { $first: "$customerEmail" },
            totalOrderAmount: { $sum: "$total" },
            totalPaidAmount: { $sum: "$amountPaid" },
            totalDueAmount: { $sum: "$amountDue" },
            createdAt: { $min: "$createdAt" },
            updatedAt: { $max: "$createdAt" }
          }
        }
      ]);

      const guestShops = guestOrderStats.map((g: any) => ({
        id: `guest-${g._id}`,
        name: g.name || "Guest Customer",
        mobile: g._id || "",
        email: g.email || "",
        dueBalance: g.totalDueAmount || 0,
        walletBalance: 0,
        creditLimit: 0,
        customerType: "Guest",
        isRetailerApproved: false,
        createdAt: g.createdAt || new Date(),
        updatedAt: g.updatedAt || new Date(),
        totalOrderAmount: g.totalOrderAmount || 0,
        totalPaidAmount: g.totalPaidAmount || 0,
        totalDueAmount: g.totalDueAmount || 0
      }));

      // Retrieve all Admin users who can also place orders
      const adminUsers = await Admin.find({})
      .select("name email mobile role createdAt updatedAt")
      .lean();

      const registeredAdmins = adminUsers
        .map((a: any) => {
          const stats = statsMap[a._id.toString()] || { totalOrderAmount: 0, totalPaidAmount: 0, totalDueAmount: 0 };
          return {
            id: a._id.toString(),
            name: a.name,
            email: a.email,
            mobile: a.mobile,
            role: a.role,
            customerType: a.role, // e.g. "admin", "super_admin", "owner"
            walletBalance: 0,
            dueBalance: stats.totalDueAmount,
            creditLimit: 0,
            isRetailerApproved: true,
            createdAt: a.createdAt,
            updatedAt: a.updatedAt,
            totalOrderAmount: stats.totalOrderAmount,
            totalPaidAmount: stats.totalPaidAmount,
            totalDueAmount: stats.totalDueAmount
          };
        })
        .filter((a: any) => a.totalOrderAmount > 0);

      // Combine and sort by updatedAt desc
      responseData.shops = [...registeredShops, ...guestShops, ...registeredAdmins].sort((a: any, b: any) => {
        const timeA = new Date(a.updatedAt).getTime();
        const timeB = new Date(b.updatedAt).getTime();
        return timeB - timeA;
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
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      // Extract unique user IDs
      const userIds = Array.from(new Set(ledgers.map((l: any) => l.userId).filter(Boolean)));

      // Fetch from User collection
      const dbUsers = await User.find({ _id: { $in: userIds } }).select("name email mobile customerType").lean();
      
      // Fetch from Admin collection (in case some are admins)
      const dbAdmins = await Admin.find({ _id: { $in: userIds } }).select("name email mobile role").lean();

      // Build a map of users and admins
      const userMap: Record<string, any> = {};
      dbUsers.forEach((u: any) => {
        userMap[u._id.toString()] = {
          id: u._id.toString(),
          name: u.name,
          email: u.email,
          mobile: u.mobile,
          customerType: u.customerType || "customer"
        };
      });
      dbAdmins.forEach((a: any) => {
        userMap[a._id.toString()] = {
          id: a._id.toString(),
          name: a.name,
          email: a.email,
          mobile: a.mobile,
          customerType: a.role || "admin"
        };
      });

      responseData.ledgers = ledgers.map((l: any) => ({
        ...l,
        id: l._id.toString(),
        _id: undefined,
        orderId: l.orderId ? l.orderId.toString() : undefined,
        userId: l.userId ? (userMap[l.userId.toString()] || null) : null
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
      const { orderId, amountPaid, paymentMethod, notes, documentUrl } = body;
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

      const isRegistered = !!order.userId || !!orderUser?._id;

      if (isRegistered) {
        // Record in Transaction Ledger
        const ledger = new TransactionLedger({
          userId: order.userId || orderUser?._id,
          orderId: order._id,
          amount: cashCollected,
          type: "collection",
          paymentMethod: paymentMethod || "cash",
          recordedBy: adminUser.email,
          notes: notes || "",
          documentUrl,
        });
        await ledger.save();

        // Reconcile user ledger using FIFO
        const { reconcileUserLedger } = await import("@/lib/ledger");
        await reconcileUserLedger((order.userId || orderUser?._id).toString());
      } else {
        // Guest order - direct update on order dues
        order.amountPaid = (order.amountPaid || 0) + cashCollected;
        order.amountDue = Math.max(0, order.total - order.amountPaid);
        order.paymentStatus = order.amountDue <= 0 ? "paid" : "partial";
        await order.save();

        // Save ledger entry
        const ledger = new TransactionLedger({
          userId: null,
          orderId: order._id,
          amount: cashCollected,
          type: "collection",
          paymentMethod: paymentMethod || "cash",
          recordedBy: adminUser.email,
          notes: notes || "",
          documentUrl,
        });
        await ledger.save();
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
      const { userId, amount, paymentMethod, notes, documentUrl } = body;
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
        notes: notes || "",
        documentUrl,
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
      return NextResponse.json({ error: "Direct retailer approval is disabled. Retailer accounts must be approved via the Consensus Promotions dashboard." }, { status: 403 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Collections POST error:", error);
    return NextResponse.json({ error: "Internal server error: " + (error.message || "Unknown error") }, { status: 500 });
  }
}
