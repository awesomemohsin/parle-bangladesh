import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import {
  readCategories,
  readOrders,
  readProducts,
  readUsers,
} from "@/lib/data-store";

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR])) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const products = readProducts();
    const orders = readOrders();
    const users = readUsers();
    const categories = readCategories();

    const recentOrders = [...orders]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);

    return NextResponse.json({
      totalProducts: products.length,
      totalOrders: orders.length,
      totalUsers: users.length,
      totalCategories: categories.length,
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
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
