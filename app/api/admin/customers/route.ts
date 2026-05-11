import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { User } from "@/lib/models";
import { logAdminActivity } from "@/lib/activity";

/**
 * GET: List all customers for management (including Guests)
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
    const search = (searchParams.get("search") || "").toLowerCase();
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const { Order } = await import("@/lib/models");
    const { ORDER_STATUS } = await import("@/lib/constants");

    // 1. Get all registered customers
    const registeredUsers = await User.find({ role: "customer" })
      .select("-password")
      .lean();

    // 2. Aggregate order statistics for ALL emails (including guests)
    const orderStats = await Order.aggregate([
      { 
        $match: { 
          status: { $ne: ORDER_STATUS.CANCELLED }
        } 
      },
      {
        $group: {
          _id: { $toLower: "$customerEmail" },
          name: { $first: "$customerName" },
          mobile: { $first: "$customerPhone" },
          ordersCount: { $sum: 1 },
          totalSpent: { $sum: "$total" },
          totalProducts: { $sum: { $sum: "$items.quantity" } },
          lastOrderDate: { $max: "$createdAt" },
          firstOrderDate: { $min: "$createdAt" }
        }
      }
    ]);

    const statsMap = new Map(orderStats.map((s: any) => [s._id, s]));
    const registeredEmails = new Set(registeredUsers.map(u => u.email.toLowerCase()));

    // 3. Merge Registered Users with their stats
    const customersList: any[] = registeredUsers.map((u: any) => {
      const stats = statsMap.get(u.email.toLowerCase()) || { ordersCount: 0, totalSpent: 0, totalProducts: 0 };
      return {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        mobile: u.mobile,
        customerType: u.customerType || "retailer",
        status: u.status,
        createdAt: u.createdAt,
        ordersCount: stats.ordersCount,
        totalSpent: stats.totalSpent,
        totalProducts: stats.totalProducts,
        isGuest: false
      };
    });

    // 4. Add Guest Customers (those who have orders but no account)
    orderStats.forEach((s: any) => {
      if (!registeredEmails.has(s._id)) {
        customersList.push({
          id: `guest-${s._id}`,
          name: s.name,
          email: s._id,
          mobile: s.mobile,
          customerType: "guest",
          status: "active",
          createdAt: s.firstOrderDate, // For guests, first order is their "joined" date
          ordersCount: s.ordersCount,
          totalSpent: s.totalSpent,
          totalProducts: s.totalProducts,
          isGuest: true
        });
      }
    });

    // 5. Apply Search Filtering
    let filtered = customersList;
    if (search) {
      filtered = customersList.filter(c => 
        c.name?.toLowerCase().includes(search) || 
        c.email?.toLowerCase().includes(search) || 
        c.mobile?.toLowerCase().includes(search)
      );
    }

    // 6. Final Sort (By dynamic field)
    filtered.sort((a: any, b: any) => {
      const fieldA = a[sortBy];
      const fieldB = b[sortBy];

      // Handle dates or numbers
      if (sortBy === "createdAt") {
        const dateA = new Date(fieldA || 0).getTime();
        const dateB = new Date(fieldB || 0).getTime();
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      }

      const valA = fieldA || 0;
      const valB = fieldB || 0;
      return sortOrder === "desc" ? valB - valA : valA - valB;
    });

    return NextResponse.json({ 
      customers: filtered.slice(0, 100) 
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

    // Guests cannot be promoted/demoted as they have no account
    if (id.startsWith("guest-")) {
      return NextResponse.json({ error: "Guest customers cannot be modified. They must register an account first." }, { status: 400 });
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
