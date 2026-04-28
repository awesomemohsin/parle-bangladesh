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

    // Build the query
    let query: any = { status: { $ne: 'cancelled' } };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // 1. CALCULATE LIFETIME REVENUE
    const lifetimeQuery: any = { status: { $ne: 'cancelled' } };
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

    // 2. CALCULATE DAILY REVENUE (Today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyQuery: any = { status: { $ne: 'cancelled' }, createdAt: { $gte: today } };
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

    // 3. CALCULATE FILTERED/RANGE STATS
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

    // 4. GET DETAILED ITEM LOGS
    // We want to see individual sales to verify price integrity
    const detailedLogs = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const formattedLogs = detailedLogs.flatMap((order: any) => 
      order.items
        .filter((item: any) => !productSlug || item.productSlug === productSlug)
        .map((item: any) => ({
          orderId: order._id.toString(),
          customerName: order.customerName,
          productName: item.name,
          productSlug: item.productSlug,
          price: item.price, // This is the actual price sold at
          quantity: item.quantity,
          total: item.price * item.quantity,
          date: order.createdAt,
          status: order.status
        }))
    );

    return NextResponse.json({
      lifetime: lifetimeStats[0] || { totalRevenue: 0, totalOrders: 0 },
      daily: dailyStats[0] || { totalRevenue: 0, totalOrders: 0 },
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
