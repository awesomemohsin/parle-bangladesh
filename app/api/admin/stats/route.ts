import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Category, Order, Product, User, Customer } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR, ROLES.OWNER])) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalProducts, totalOrders, todaysOrders, regUsers, guestUsers, totalCategories, recentOrders, warehouseStats, revenueStats] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments(),
      Customer.countDocuments(),
      Category.countDocuments(),
      Order.find().sort({ createdAt: -1 }).limit(5).lean(),
      Product.aggregate([
        { $unwind: "$variations" },
        {
          $group: {
            _id: null,
            totalStock: { $sum: "$variations.stock" },
            totalOnHold: { $sum: "$variations.holdStock" },
            totalDelivered: { $sum: "$variations.deliveredCount" },
            totalLost: { $sum: "$variations.lostCount" },
            totalDamaged: { $sum: "$variations.damagedCount" }
          }
        }
      ]),
      Order.aggregate([
        {
          $facet: {
            lifetime: [
              { $match: { status: { $ne: 'cancelled' } } },
              { $group: { _id: null, total: { $sum: "$total" } } }
            ],
            today: [
              { $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: today } } },
              { $group: { _id: null, total: { $sum: "$total" } } }
            ]
          }
        }
      ])
    ]);

    const globalWarehouse = warehouseStats[0] || { totalStock: 0, totalOnHold: 0, totalDelivered: 0, totalLost: 0, totalDamaged: 0 };
    const lifetimeRevenue = revenueStats[0]?.lifetime[0]?.total || 0;
    const todaysRevenue = revenueStats[0]?.today[0]?.total || 0;

    return NextResponse.json({
      totalProducts,
      totalOrders,
      todaysOrders,
      todaysRevenue,
      lifetimeRevenue,
      totalUsers: regUsers + guestUsers,
      totalCategories,
      warehouse: globalWarehouse,
      recentOrders: recentOrders.map((order) => ({
        id: order._id.toString(),
        customerName: order.customerName,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt,
      })),
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
