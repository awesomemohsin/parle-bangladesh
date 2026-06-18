import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Order, User } from "@/lib/models";
import mongoose from "mongoose";

function getFilterStages(customerTypeFilter: string) {
  if (customerTypeFilter === "all") return [];
  
  let matchCond: any = {};
  if (customerTypeFilter === "customer") {
    matchCond = { resolvedCustomerType: { $in: ["customer", "guest"] } };
  } else if (customerTypeFilter === "b2b") {
    matchCond = { resolvedCustomerType: { $in: ["retailer", "dealer"] } };
  } else if (customerTypeFilter === "staff") {
    matchCond = { resolvedCustomerType: { $in: ["admin", "super_admin", "moderator", "owner"] } };
  } else if (customerTypeFilter === "other") {
    matchCond = { resolvedCustomerType: { $nin: ["customer", "guest", "retailer", "dealer", "admin", "super_admin", "moderator", "owner"] } };
  }

  return [
    {
      $lookup: {
        from: "users",
        let: { userIdStr: "$userId" },
        pipeline: [
          { $addFields: { idStr: { $toString: "$_id" } } },
          { $match: { $expr: { $eq: ["$idStr", "$$userIdStr"] } } }
        ],
        as: "userDoc"
      }
    },
    {
      $lookup: {
        from: "admins",
        let: { userIdStr: "$userId" },
        pipeline: [
          { $addFields: { idStr: { $toString: "$_id" } } },
          { $match: { $expr: { $eq: ["$idStr", "$$userIdStr"] } } }
        ],
        as: "adminDoc"
      }
    },
    {
      $addFields: {
        resolvedUser: { $arrayElemAt: ["$userDoc", 0] },
        resolvedAdmin: { $arrayElemAt: ["$adminDoc", 0] }
      }
    },
    {
      $addFields: {
        resolvedCustomerType: {
          $cond: {
            if: { $or: [{ $eq: ["$userId", null] }, { $eq: ["$userId", ""] }] },
            then: "guest",
            else: {
              $cond: {
                if: { $ne: ["$resolvedUser", null] },
                then: { $ifNull: ["$resolvedUser.customerType", { $ifNull: ["$resolvedUser.role", "customer"] }] },
                else: {
                  $cond: {
                    if: { $ne: ["$resolvedAdmin", null] },
                    then: {
                      $cond: {
                        if: { $eq: ["$resolvedAdmin.role", "owner"] },
                        then: "owner",
                        else: { $ifNull: ["$resolvedAdmin.role", "admin"] }
                      }
                    },
                    else: { $ifNull: ["$customerType", "customer"] }
                  }
                }
              }
            }
          }
        }
      }
    },
    { $match: matchCond }
  ];
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    if (!user || !hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OWNER])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const productId = searchParams.get("productId");
    const customerType = searchParams.get("customerType") || "all";

    const filterStages = getFilterStages(customerType);

    // Build the query - ONLY DELIVERED for standard revenue tracking
    let query: any = { status: 'delivered' };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
    }
    if (productId) query["items.productId"] = productId;

    // 1. CALCULATE LIFETIME REVENUE (DELIVERED ONLY)
    const lifetimeQuery: any = { status: 'delivered' };
    if (productId) lifetimeQuery["items.productId"] = productId;

    // Define activeRangeQuery, pendingQuery, lossQuery early to apply SR filters consistently
    const activeRangeQuery: any = { status: { $in: ['pending', 'processing', 'shipped', 'delivered'] } };
    if (startDate || endDate) {
      activeRangeQuery.createdAt = {};
      if (startDate) activeRangeQuery.createdAt.$gte = new Date(startDate);
      if (endDate) activeRangeQuery.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
    }
    if (productId) activeRangeQuery["items.productId"] = productId;

    const pendingQuery: any = { status: { $in: ['pending', 'processing', 'shipped'] } };
    if (productId) pendingQuery["items.productId"] = productId;

    const lossQuery: any = { status: { $in: ['lost', 'damaged'] } };
    if (productId) lossQuery["items.productId"] = productId;

    const srId = searchParams.get("srId");
    if (srId && srId !== "all") {
      const srIdObj = mongoose.Types.ObjectId.isValid(srId) ? new mongoose.Types.ObjectId(srId) : null;
      const srFilter = { $in: [srId, srIdObj].filter(Boolean) };
      query.placedBySR = srFilter;
      lifetimeQuery.placedBySR = srFilter;
      activeRangeQuery.placedBySR = srFilter;
      pendingQuery.placedBySR = srFilter;
      lossQuery.placedBySR = srFilter;
    }


    const lifetimeStats = await Order.aggregate([
      { $match: lifetimeQuery },
      ...filterStages,
      ...(productId ? [{ $unwind: "$items" }, { $match: { "items.productId": productId } }] : []),
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: productId ? { $multiply: ["$items.price", "$items.quantity"] } : "$total" },
          totalOrders: { $addToSet: "$_id" }
        }
      },
      { $project: { totalRevenue: 1, totalOrders: { $size: "$totalOrders" } } }
    ]);

    // 2. CALCULATE DAILY REVENUE (Today - DELIVERED ONLY)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyQuery: any = { status: 'delivered', updatedAt: { $gte: today } };
    if (productId) dailyQuery["items.productId"] = productId;

    const dailyStats = await Order.aggregate([
      { $match: dailyQuery },
      ...filterStages,
      ...(productId ? [{ $unwind: "$items" }, { $match: { "items.productId": productId } }] : []),
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: productId ? { $multiply: ["$items.price", "$items.quantity"] } : "$total" },
          totalOrders: { $addToSet: "$_id" }
        }
      },
      { $project: { totalRevenue: 1, totalOrders: { $size: "$totalOrders" } } }
    ]);

    // 3. CALCULATE PENDING SALES (Pending, Processing, Shipped)
    // pendingQuery is already declared and filtered early


    const pendingStats = await Order.aggregate([
      { $match: pendingQuery },
      ...filterStages,
      { $unwind: "$items" },
      ...(productId ? [{ $match: { "items.productId": productId } }] : []),
      {
        $group: {
          _id: "$_id",
          total: { $first: "$total" },
          itemRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          itemQuantity: { $sum: "$items.quantity" }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: productId ? "$itemRevenue" : "$total" },
          totalOrders: { $addToSet: "$_id" },
          totalProducts: { $sum: "$itemQuantity" }
        }
      },
      { $project: { totalRevenue: 1, totalOrders: { $size: "$totalOrders" }, totalProducts: 1 } }
    ]);

    // 4. CALCULATE LOSS (Lost, Damaged)
    // lossQuery is already declared and filtered early


    const lossStats = await Order.aggregate([
      { $match: lossQuery },
      ...filterStages,
      ...(productId ? [{ $unwind: "$items" }, { $match: { "items.productId": productId } }] : []),
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: productId ? { $multiply: ["$items.price", "$items.quantity"] } : "$total" },
          totalOrders: { $addToSet: "$_id" }
        }
      },
      { $project: { totalRevenue: 1, totalOrders: { $size: "$totalOrders" } } }
    ]);

    // 5. CALCULATE FILTERED/RANGE STATS (DELIVERED ONLY)
    const rangeStats = await Order.aggregate([
      { $match: query },
      ...filterStages,
      { $unwind: "$items" },
      // Apply product filter if provided
      ...(productId ? [{ $match: { "items.productId": productId } }] : []),
      {
        $group: {
          _id: "$items.productId",
          productName: { $first: "$items.name" },
          totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          totalQuantity: { $sum: "$items.quantity" },
          orders: { $addToSet: "$_id" }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // 6. GET DETAILED ITEM LOGS (DELIVERED ONLY for Sales List)
    let detailedLogs;
    if (customerType === "all") {
      detailedLogs = await Order.find(query)
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
    } else {
      detailedLogs = await Order.aggregate([
        { $match: query },
        ...filterStages,
        { $sort: { createdAt: -1 } },
        { $limit: 100 }
      ]);
    }

    const formattedLogs = detailedLogs.flatMap((order: any) => {
      // For delivered orders, the sale date is the delivery date (updatedAt or from logs)
      const deliveryLog = order.orderLogs?.find((l: any) => l.toStatus === 'delivered');
      const saleDate = deliveryLog ? deliveryLog.changedAt : order.updatedAt;

      return order.items
        .filter((item: any) => !productId || item.productId === productId)
        .map((item: any) => ({
          orderId: order._id.toString(),
          customerName: order.customerName,
          productName: item.name,
          productSlug: item.productSlug,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
          date: saleDate || order.createdAt,
          status: order.status
        }));
    });

    // 5.1 CALCULATE FILTERED/RANGE STATS OVERALL (DELIVERED ONLY)
    const rangeSummaryStats = await Order.aggregate([
      { $match: query },
      ...filterStages,
      { $unwind: "$items" },
      ...(productId ? [{ $match: { "items.productId": productId } }] : []),
      {
        $group: {
          _id: "$_id",
          total: { $first: "$total" },
          itemRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          itemQuantity: { $sum: "$items.quantity" }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: productId ? "$itemRevenue" : "$total" },
          totalOrders: { $addToSet: "$_id" },
          totalProducts: { $sum: "$itemQuantity" }
        }
      },
      { $project: { totalRevenue: 1, totalOrders: { $size: "$totalOrders" }, totalProducts: 1 } }
    ]);
    const rStats = rangeSummaryStats[0] || { totalRevenue: 0, totalOrders: 0, totalProducts: 0 };

    // 5.2 CALCULATE ACTIVE RANGE STATS (Pending, Processing, Shipped, Delivered)
    // activeRangeQuery is already declared and filtered early


    const activeRangeStats = await Order.aggregate([
      { $match: activeRangeQuery },
      ...filterStages,
      { $unwind: "$items" },
      ...(productId ? [{ $match: { "items.productId": productId } }] : []),
      {
        $group: {
          _id: "$_id",
          total: { $first: "$total" },
          itemRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          itemQuantity: { $sum: "$items.quantity" }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: productId ? "$itemRevenue" : "$total" },
          totalOrders: { $addToSet: "$_id" },
          totalProducts: { $sum: "$itemQuantity" }
        }
      },
      { $project: { totalRevenue: 1, totalOrders: { $size: "$totalOrders" }, totalProducts: 1 } }
    ]);
    const aStats = activeRangeStats[0] || { totalRevenue: 0, totalOrders: 0, totalProducts: 0 };

    // Fetch detailed orders for modal drill-down
    const drillDownPending = await Order.aggregate([
      { $match: pendingQuery },
      ...filterStages,
      ...(productId ? [{ $match: { "items.productId": productId } }] : []),
      { $sort: { createdAt: -1 } },
      { $limit: 50 }
    ]);

    const drillDownDaily = await Order.aggregate([
      { $match: dailyQuery },
      ...filterStages,
      ...(productId ? [{ $match: { "items.productId": productId } }] : []),
      { $sort: { updatedAt: -1 } },
      { $limit: 50 }
    ]);

    const drillDownLoss = await Order.aggregate([
      { $match: lossQuery },
      ...filterStages,
      ...(productId ? [{ $match: { "items.productId": productId } }] : []),
      { $sort: { createdAt: -1 } },
      { $limit: 50 }
    ]);

    // Fetch all sales representatives
    const salesReps = await User.find({ isSR: true }).select("name email mobile").lean();
    const salesRepresentatives = salesReps.map((sr: any) => ({
      id: sr._id.toString(),
      name: sr.name,
      email: sr.email,
      mobile: sr.mobile
    }));

    return NextResponse.json({
      salesRepresentatives,
      lifetime: lifetimeStats[0] || { totalRevenue: 0, totalOrders: 0 },

      daily: dailyStats[0] || { totalRevenue: 0, totalOrders: 0 },
      pending: pendingStats[0] || { totalRevenue: 0, totalOrders: 0, totalProducts: 0 },
      loss: lossStats[0] || { totalRevenue: 0, totalOrders: 0 },
      activeRange: {
        totalRevenue: aStats.totalRevenue,
        totalOrders: aStats.totalOrders,
        totalProducts: aStats.totalProducts
      },
      range: {
        totalRevenue: rStats.totalRevenue,
        totalOrders: rStats.totalOrders,
        totalProducts: rStats.totalProducts,
        items: rangeStats
      },
      logs: formattedLogs,
      drillDown: {
        pending: drillDownPending.map((o: any) => ({
          id: o._id.toString(),
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          total: o.total,
          status: o.status,
          createdAt: o.createdAt,
          items: o.items.map((i: any) => ({ name: i.name, quantity: i.quantity, price: i.price }))
        })),
        daily: drillDownDaily.map((o: any) => ({
          id: o._id.toString(),
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          total: o.total,
          status: o.status,
          updatedAt: o.updatedAt,
          createdAt: o.createdAt,
          items: o.items.map((i: any) => ({ name: i.name, quantity: i.quantity, price: i.price }))
        })),
        loss: drillDownLoss.map((o: any) => ({
          id: o._id.toString(),
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          total: o.total,
          status: o.status,
          createdAt: o.createdAt,
          items: o.items.map((i: any) => ({ name: i.name, quantity: i.quantity, price: i.price }))
        }))
      }
    });

  } catch (error) {
    console.error("Revenue Analytics Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
