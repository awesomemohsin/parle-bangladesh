import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models";

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
    const productSlug = searchParams.get("productSlug");

    // Build the query - ONLY DELIVERED for standard revenue tracking
    let query: any = { status: 'delivered' };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    if (productSlug) query["items.productSlug"] = productSlug;

    // 1. CALCULATE LIFETIME REVENUE (DELIVERED ONLY)
    const lifetimeQuery: any = { status: 'delivered' };
    if (productSlug) lifetimeQuery["items.productSlug"] = productSlug;

    const lifetimeStats = await Order.aggregate([
      { $match: lifetimeQuery },
      ...(productSlug ? [{ $unwind: "$items" }, { $match: { "items.productSlug": productSlug } }] : []),
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: productSlug ? { $multiply: ["$items.price", "$items.quantity"] } : "$total" },
          totalOrders: { $addToSet: "$_id" }
        }
      },
      { $project: { totalRevenue: 1, totalOrders: { $size: "$totalOrders" } } }
    ]);

    // 2. CALCULATE DAILY REVENUE (Today - DELIVERED ONLY)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyQuery: any = { status: 'delivered', updatedAt: { $gte: today } };
    if (productSlug) dailyQuery["items.productSlug"] = productSlug;

    const dailyStats = await Order.aggregate([
      { $match: dailyQuery },
      ...(productSlug ? [{ $unwind: "$items" }, { $match: { "items.productSlug": productSlug } }] : []),
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: productSlug ? { $multiply: ["$items.price", "$items.quantity"] } : "$total" },
          totalOrders: { $addToSet: "$_id" }
        }
      },
      { $project: { totalRevenue: 1, totalOrders: { $size: "$totalOrders" } } }
    ]);

    // 3. CALCULATE PENDING SALES (Pending, Processing, Shipped)
    const pendingQuery: any = { status: { $in: ['pending', 'processing', 'shipped'] } };
    if (productSlug) pendingQuery["items.productSlug"] = productSlug;

    const pendingStats = await Order.aggregate([
      { $match: pendingQuery },
      ...(productSlug ? [{ $unwind: "$items" }, { $match: { "items.productSlug": productSlug } }] : []),
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: productSlug ? { $multiply: ["$items.price", "$items.quantity"] } : "$total" },
          totalOrders: { $addToSet: "$_id" }
        }
      },
      { $project: { totalRevenue: 1, totalOrders: { $size: "$totalOrders" } } }
    ]);

    // 4. CALCULATE LOSS (Lost, Damaged)
    const lossQuery: any = { status: { $in: ['lost', 'damaged'] } };
    if (productSlug) lossQuery["items.productSlug"] = productSlug;

    const lossStats = await Order.aggregate([
      { $match: lossQuery },
      ...(productSlug ? [{ $unwind: "$items" }, { $match: { "items.productSlug": productSlug } }] : []),
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: productSlug ? { $multiply: ["$items.price", "$items.quantity"] } : "$total" },
          totalOrders: { $addToSet: "$_id" }
        }
      },
      { $project: { totalRevenue: 1, totalOrders: { $size: "$totalOrders" } } }
    ]);

    // 5. CALCULATE FILTERED/RANGE STATS (DELIVERED ONLY)
    const rangeStats = await Order.aggregate([
      { $match: query },
      { $unwind: "$items" },
      // Apply product filter if provided
      ...(productSlug ? [{ $match: { "items.productSlug": productSlug } }] : []),
      {
        $group: {
          _id: "$items.productSlug",
          productName: { $first: "$items.name" },
          totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          totalQuantity: { $sum: "$items.quantity" },
          orders: { $addToSet: "$_id" }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // 6. GET DETAILED ITEM LOGS (DELIVERED ONLY for Sales List)
    const detailedLogs = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const formattedLogs = detailedLogs.flatMap((order: any) => {
      // For delivered orders, the sale date is the delivery date (updatedAt or from logs)
      const deliveryLog = order.orderLogs?.find((l: any) => l.toStatus === 'delivered');
      const saleDate = deliveryLog ? deliveryLog.changedAt : order.updatedAt;

      return order.items
        .filter((item: any) => !productSlug || item.productSlug === productSlug)
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

    return NextResponse.json({
      lifetime: lifetimeStats[0] || { totalRevenue: 0, totalOrders: 0 },
      daily: dailyStats[0] || { totalRevenue: 0, totalOrders: 0 },
      pending: pendingStats[0] || { totalRevenue: 0, totalOrders: 0 },
      loss: lossStats[0] || { totalRevenue: 0, totalOrders: 0 },
      range: {
        totalRevenue: rangeStats.reduce((acc, curr) => acc + curr.totalRevenue, 0),
        totalOrders: new Set(rangeStats.flatMap(rs => rs.orders)).size,
        items: rangeStats
      },
      logs: formattedLogs
    });

  } catch (error) {
    console.error("Revenue Analytics Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
