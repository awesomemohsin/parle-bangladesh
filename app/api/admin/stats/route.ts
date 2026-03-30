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

    if (!hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR])) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const [totalProducts, totalOrders, regUsers, guestUsers, totalCategories, recentOrders] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      User.countDocuments(),
      Customer.countDocuments(),
      Category.countDocuments(),
      Order.find().sort({ createdAt: -1 }).limit(5).lean()
    ]);

    return NextResponse.json({
      totalProducts,
      totalOrders,
      totalUsers: regUsers + guestUsers,
      totalCategories,
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
