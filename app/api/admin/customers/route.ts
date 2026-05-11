import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { User } from "@/lib/models";
import { logAdminActivity } from "@/lib/activity";

/**
 * GET: List all customers for management
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const currentUser = getAuthUserFromRequest(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    // Only super_admin and owner can manage customers
    if (!hasAnyRole(currentUser, [ROLES.SUPER_ADMIN, ROLES.OWNER])) {
      return NextResponse.json({ error: "Access denied. High-level authorization required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    let query: any = { role: "customer" };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
      ];
    }

    const customers = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const customerEmails = customers.map((c: any) => c.email.toLowerCase());

    const { Order } = await import("@/lib/models");
    const { ORDER_STATUS } = await import("@/lib/constants");

    const stats = await Order.aggregate([
      { 
        $match: { 
          customerEmail: { $in: customerEmails },
          status: { $ne: ORDER_STATUS.CANCELLED }
        } 
      },
      {
        $group: {
          _id: { $toLower: "$customerEmail" },
          ordersCount: { $sum: 1 },
          totalSpent: { $sum: "$total" },
          totalProducts: { $sum: { $sum: "$items.quantity" } }
        }
      }
    ]);

    const statsMap = new Map(stats.map((s: any) => [s._id, s]));

    return NextResponse.json({ 
      customers: customers.map((c: any) => {
        const customerStats = statsMap.get(c.email.toLowerCase()) || { ordersCount: 0, totalSpent: 0, totalProducts: 0 };
        return { 
          ...c, 
          id: c._id.toString(),
          ordersCount: customerStats.ordersCount,
          totalSpent: customerStats.totalSpent,
          totalProducts: customerStats.totalProducts
        };
      }) 
    });
  } catch (error) {
    console.error("Customers GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH: Promote or demote a customer (Consolidated into single route)
 */
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    const currentUser = getAuthUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    if (!hasAnyRole(currentUser, [ROLES.SUPER_ADMIN, ROLES.OWNER])) {
      return NextResponse.json({ error: "Forbidden: SuperAdmin only" }, { status: 403 });
    }

    const body = await request.json();
    const { id, customerType, status } = body;

    if (!id) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    const customer = await User.findById(id);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const oldType = customer.customerType;
    
    if (customerType && ["retailer", "dealer"].includes(customerType)) {
      customer.customerType = customerType;
      // Force logout by incrementing version
      customer.tokenVersion = (customer.tokenVersion || 0) + 1;
    }
    if (status && ["active", "disabled"].includes(status)) {
      customer.status = status;
      // Force logout by incrementing version
      customer.tokenVersion = (customer.tokenVersion || 0) + 1;
    }
    
    await customer.save();

    await logAdminActivity({
      adminEmail: currentUser.email,
      action: "update_customer",
      targetId: customer._id.toString(),
      targetName: customer.name,
      details: `Updated customer ${customer.email}: Type ${oldType}->${customer.customerType}`
    });

    return NextResponse.json({ 
      message: "Customer updated successfully",
      customer: {
        id: customer._id.toString(),
        customerType: customer.customerType
      }
    });
  } catch (error: any) {
    console.error("Customer PATCH error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
