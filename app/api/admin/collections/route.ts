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
    const srId = searchParams.get("srId");

    if (type === "customer-details") {
      const customerId = searchParams.get("customerId");
      const customerMobile = searchParams.get("customerMobile");

      if (!customerId && !customerMobile) {
        return NextResponse.json({ error: "customerId or customerMobile is required" }, { status: 400 });
      }

      // Fetch user info
      let dbUser: any = null;
      if (customerId && !customerId.startsWith("guest-") && mongoose.Types.ObjectId.isValid(customerId)) {
        // Reconcile ledger dynamically on-demand to heal any potential calculation drifts
        const { reconcileUserLedger } = await import("@/lib/ledger");
        try {
          await reconcileUserLedger(customerId);
        } catch (err) {
          console.error(`Failed to reconcile ledger for customer ${customerId}:`, err);
        }

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
          createdAt: o.createdAt,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          customerEmail: o.customerEmail
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
      const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;

      const activeOrders = await Order.collection.find({
        $or: [{ userId }, { userId: userIdObj }].filter(Boolean) as any,
        status: { $in: ["processing", "shipped", "delivered"] },
        paymentMethod: { $ne: "sslcommerz" }
      }).sort({ createdAt: 1 }).toArray() as any[];

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
          due: order.paymentStatus === "paid" ? 0 : (order.amountDue || order.total)
        });
      }

      const ledgers = await TransactionLedger.collection.find({
        $or: [{ userId }, { userId: userIdObj }].filter(Boolean) as any,
        type: { $in: ["collection", "wallet_deposit"] }
      }).sort({ createdAt: 1 }).toArray() as any[];

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
      const outstandingOrders = await Order.find(queryCond).sort({ createdAt: -1 }).lean();
      if (srId) {
        const srIdObj = mongoose.Types.ObjectId.isValid(srId) ? new mongoose.Types.ObjectId(srId) : null;
        queryCond.placedBySR = { $in: [srId, srIdObj].filter(Boolean) };
      }
      
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

      // Calculate Total Orders stats (pending, processing, shipped, delivered)
      const totalOrdersCond: any = {
        status: { $in: ["pending", "processing", "shipped", "delivered"] }
      };
      if (startDate || endDate) {
        totalOrdersCond.createdAt = {};
        if (startDate) totalOrdersCond.createdAt.$gte = new Date(startDate);
        if (endDate) totalOrdersCond.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
      }
      if (srId) {
        const srIdObj = mongoose.Types.ObjectId.isValid(srId) ? new mongoose.Types.ObjectId(srId) : null;
        totalOrdersCond.placedBySR = { $in: [srId, srIdObj].filter(Boolean) };
      }
      const totalOrdersSum = await Order.aggregate([
        { $match: totalOrdersCond },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$total" },
            count: { $sum: 1 }
          }
        }
      ]);
      responseData.totalOrdersStats = {
        amount: totalOrdersSum[0]?.totalAmount || 0,
        count: totalOrdersSum[0]?.count || 0
      };
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
      if (srId) {
        const srIdObj = mongoose.Types.ObjectId.isValid(srId) ? new mongoose.Types.ObjectId(srId) : null;
        queryCond.placedBySR = { $in: [srId, srIdObj].filter(Boolean) };
      }
      const completedOrders = await Order.find(queryCond).sort({ updatedAt: -1 }).lean();
      
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
      const B2BShopsQuery: any = {
        $or: [
          { role: "customer" },
          { walletBalance: { $ne: 0 } }
        ]
      };
      if (srId) {
        const srIdObj = mongoose.Types.ObjectId.isValid(srId) ? new mongoose.Types.ObjectId(srId) : null;
        B2BShopsQuery.referredBySR = { $in: [srId, srIdObj].filter(Boolean) };
      }
      const B2BShops = await User.find(B2BShopsQuery)
        .select("name email mobile role walletBalance creditLimit customerType isSR isRetailerApproved createdAt updatedAt")
        .sort({ updatedAt: -1 })
        .lean();

      const orderStatsCond: any = {
        userId: { $nin: [null, ""], $exists: true },
        status: { $in: ["processing", "shipped", "delivered"] }
      };
      if (srId) {
        const srIdObj = mongoose.Types.ObjectId.isValid(srId) ? new mongoose.Types.ObjectId(srId) : null;
        orderStatsCond.placedBySR = { $in: [srId, srIdObj].filter(Boolean) };
      }
      const orderStats = await Order.aggregate([
        {
          $match: orderStatsCond
        },
        {
          $group: {
            _id: "$userId",
            totalOrderAmount: { $sum: "$total" },
            totalPaidAmount: { $sum: "$amountPaid" },
            totalDueAmount: {
              $sum: {
                $cond: {
                  if: { $eq: ["$paymentStatus", "paid"] },
                  then: 0,
                  else: { $cond: { if: { $gt: ["$amountDue", 0] }, then: "$amountDue", else: "$total" } }
                }
              }
            }
          }
        }
      ]);

      const statsMap: Record<string, { totalOrderAmount: number; totalPaidAmount: number; totalDueAmount: number }> = {};
      orderStats.forEach((stat: any) => {
        if (stat._id) {
          const idStr = stat._id.toString();
          if (statsMap[idStr]) {
            statsMap[idStr].totalOrderAmount += stat.totalOrderAmount || 0;
            statsMap[idStr].totalPaidAmount += stat.totalPaidAmount || 0;
            statsMap[idStr].totalDueAmount += stat.totalDueAmount || 0;
          } else {
            statsMap[idStr] = {
              totalOrderAmount: stat.totalOrderAmount || 0,
              totalPaidAmount: stat.totalPaidAmount || 0,
              totalDueAmount: stat.totalDueAmount || 0
            };
          }
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

      const guestMatchCond: any = {
        $or: [
          { userId: { $exists: false } },
          { userId: null },
          { userId: "" }
        ],
        status: { $in: ["processing", "shipped", "delivered"] }
      };
      if (srId) {
        const srIdObj = mongoose.Types.ObjectId.isValid(srId) ? new mongoose.Types.ObjectId(srId) : null;
        guestMatchCond.placedBySR = { $in: [srId, srIdObj].filter(Boolean) };
      }
      const guestOrderStats = await Order.aggregate([
        {
          $match: guestMatchCond
        },
        {
          $group: {
            _id: "$customerPhone",
            name: { $first: "$customerName" },
            email: { $first: "$customerEmail" },
            totalOrderAmount: { $sum: "$total" },
            totalPaidAmount: { $sum: "$amountPaid" },
            totalDueAmount: {
              $sum: {
                $cond: {
                  if: { $eq: ["$paymentStatus", "paid"] },
                  then: 0,
                  else: { $cond: { if: { $gt: ["$amountDue", 0] }, then: "$amountDue", else: "$total" } }
                }
              }
            },
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
      .select("name email mobile role walletBalance creditLimit createdAt updatedAt")
      .lean();

      const registeredAdmins = adminUsers
        .map((a: any) => {
          const bal = a.walletBalance || 0;
          const stats = statsMap[a._id.toString()] || { totalOrderAmount: 0, totalPaidAmount: 0, totalDueAmount: 0 };
          return {
            id: a._id.toString(),
            name: a.name,
            email: a.email,
            mobile: a.mobile,
            role: a.role,
            customerType: a.role, // e.g. "admin", "super_admin", "owner"
            dueBalance: bal < 0 ? Math.abs(bal) : 0,
            walletBalance: bal > 0 ? bal : 0,
            creditLimit: a.creditLimit || 0,
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

      // Extract unique order IDs for guest orders where userId is missing
      const guestOrderIds = Array.from(
        new Set(
          ledgers
            .filter((l: any) => !l.userId && l.orderId)
            .map((l: any) => l.orderId)
        )
      );

      // Fetch guest order customer details
      const dbOrders = await Order.find({ _id: { $in: guestOrderIds } })
        .select("customerName customerPhone customerEmail customerType")
        .lean();

      const orderMap: Record<string, any> = {};
      dbOrders.forEach((o: any) => {
        orderMap[o._id.toString()] = {
          name: o.customerName,
          email: o.customerEmail,
          mobile: o.customerPhone,
          customerType: o.customerType || "guest"
        };
      });

      responseData.ledgers = ledgers.map((l: any) => {
        let resolvedUserId = null;
        if (l.userId) {
          resolvedUserId = userMap[l.userId.toString()] || null;
        } else if (l.orderId && orderMap[l.orderId.toString()]) {
          const oInfo = orderMap[l.orderId.toString()];
          resolvedUserId = {
            id: `guest-${oInfo.mobile}`,
            name: oInfo.name || "Guest Customer",
            email: oInfo.email || "",
            mobile: oInfo.mobile || "",
            customerType: oInfo.customerType || "guest"
          };
        }

        return {
          ...l,
          id: l._id.toString(),
          _id: undefined,
          orderId: l.orderId ? l.orderId.toString() : undefined,
          userId: resolvedUserId
        };
      });

      // Calculate total collected (collections + wallet deposits) matching date range filters if present
      const collectionsTotalCond: any = { type: { $in: ["collection", "wallet_deposit"] } };
      if (startDate || endDate) {
        collectionsTotalCond.createdAt = {};
        if (startDate) collectionsTotalCond.createdAt.$gte = new Date(startDate);
        if (endDate) collectionsTotalCond.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
      }
      const totalCollectionsSum = await TransactionLedger.aggregate([
        { $match: collectionsTotalCond },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
      responseData.totalCollected = totalCollectionsSum[0]?.total || 0;
    }

    if (type === "all") {
      const salesReps = await User.find({ isSR: true }).select("name email mobile").lean();
      responseData.salesRepresentatives = salesReps.map((sr: any) => ({
        id: sr._id.toString(),
        name: sr.name,
        email: sr.email,
        mobile: sr.mobile
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

    const allowedEmails = ["sohag@circlenetworkbd.net", "mdmohsin.work@gmail.com"];
    const isAuthorized = allowedEmails.includes(adminUser.email?.toLowerCase().trim());
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: Only authorized operators can update collections." }, { status: 403 });
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

      let shopUser = await User.findById(userId);
      if (!shopUser) {
        shopUser = await Admin.findById(userId);
      }
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

    // D. Force Reconcile All Ledgers
    if (action === "force-reconcile-all") {
      const users = await User.find({}).select("_id").lean();
      const admins = await Admin.find({}).select("_id").lean();
      const allAccountIds = [
        ...users.map((u: any) => u._id.toString()),
        ...admins.map((a: any) => a._id.toString())
      ];

      const { reconcileUserLedger } = await import("@/lib/ledger");
      
      let reconciledCount = 0;
      let failedCount = 0;

      for (const id of allAccountIds) {
        try {
          await reconcileUserLedger(id);
          reconciledCount++;
        } catch (err) {
          console.error(`Failed to reconcile ledger for ID ${id}:`, err);
          failedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Successfully reconciled ${reconciledCount} accounts. Failed: ${failedCount}.`
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Collections POST error:", error);
    return NextResponse.json({ error: "Internal server error: " + (error.message || "Unknown error") }, { status: 500 });
  }
}
