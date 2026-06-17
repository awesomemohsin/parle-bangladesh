import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { User, Admin } from "@/lib/models";
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
    const customerType = searchParams.get("customerType") || "";

    const { Order, ApprovalRequest } = await import("@/lib/models");
    const { ORDER_STATUS } = await import("@/lib/constants");

    // Fetch all pending customer approval requests
    const pendingPromotions = await ApprovalRequest.find({
      type: "customer",
      status: "pending"
    }).select("targetId").lean();

    const pendingIds = new Set(pendingPromotions.map(p => p.targetId.toString()));

    // 1. Get all registered customers
    const registeredUsers = await User.find({ role: "customer" })
      .select("-password")
      .lean();

    // Get all registered admins/superadmins/etc.
    const dbAdmins = await Admin.find()
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
    dbAdmins.forEach(a => registeredEmails.add(a.email.toLowerCase()));

    // 3. Merge Registered Users with their stats
    const customersList: any[] = registeredUsers.map((u: any) => {
      const stats = statsMap.get(u.email.toLowerCase()) || { ordersCount: 0, totalSpent: 0, totalProducts: 0 };
      const bal = u.walletBalance || 0;
      return {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        mobile: u.mobile,
        customerType: u.customerType || "customer",
        status: u.status,
        createdAt: u.createdAt,
        ordersCount: stats.ordersCount,
        totalSpent: stats.totalSpent,
        totalProducts: stats.totalProducts,
        isGuest: false,
        flatDiscountPercent: u.flatDiscountPercent,
        flatDiscountExpiresAt: u.flatDiscountExpiresAt,
        pendingApproval: pendingIds.has(u._id.toString()),
        dueBalance: bal < 0 ? Math.abs(bal) : 0,
        walletBalance: bal > 0 ? bal : 0
      };
    });

    // Merge Admins with their stats (only if they have orders)
    dbAdmins.forEach((a: any) => {
      const stats = statsMap.get(a.email.toLowerCase());
      if (stats) {
        customersList.push({
          id: a._id.toString(),
          name: a.name,
          email: a.email,
          mobile: a.mobile,
          customerType: a.role || "admin",
          status: a.status,
          createdAt: a.createdAt,
          ordersCount: stats.ordersCount,
          totalSpent: stats.totalSpent,
          totalProducts: stats.totalProducts,
          isGuest: false,
          flatDiscountPercent: undefined,
          flatDiscountExpiresAt: undefined,
          pendingApproval: false,
          dueBalance: 0,
          walletBalance: 0
        });
      }
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

    // 6. Compute dynamic counts based on active search
    const counts = {
      all: filtered.length,
      customer: filtered.filter(c => c.customerType === "customer").length,
      guest: filtered.filter(c => c.customerType === "guest").length,
      retailer: filtered.filter(c => c.customerType === "retailer").length,
      dealer: filtered.filter(c => c.customerType === "dealer").length,
      staff: filtered.filter(c => ["admin", "super_admin", "superadmin", "moderator", "owner"].includes(c.customerType)).length,
      student: filtered.filter(c => c.customerType === "student").length,
      influencer: filtered.filter(c => c.customerType === "influencer").length,
      corporate: filtered.filter(c => c.customerType === "corporate").length,
      other: filtered.filter(c => !["guest", "customer", "retailer", "dealer", "student", "influencer", "corporate", "admin", "super_admin", "superadmin", "moderator", "owner"].includes(c.customerType)).length,
    };

    // 7. Apply Role/Type Filtering
    if (customerType) {
      if (customerType === "staff") {
        filtered = filtered.filter(c => ["admin", "super_admin", "superadmin", "moderator", "owner"].includes(c.customerType));
      } else if (customerType === "other") {
        filtered = filtered.filter(c => !["guest", "customer", "retailer", "dealer", "student", "influencer", "corporate", "admin", "super_admin", "superadmin", "moderator", "owner"].includes(c.customerType));
      } else {
        filtered = filtered.filter(c => c.customerType === customerType);
      }
    }

    // 8. Final Sort (By dynamic field)
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
      customers: filtered.slice(0, 100),
      counts
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
    let pendingApproval = false;

    if (customerType && customerType !== customer.customerType) {
      if (customerType === "customer") {
        // DEMOTION: Applies instantly without approval
        customer.customerType = "customer";
        customer.flatDiscountPercent = undefined;
        customer.flatDiscountExpiresAt = undefined;
      } else {
        // PROMOTION: Requires Level 2 consensus approval (Anindo + Saiful)
        const discountVal = Number(body.flatDiscountPercent) || 0;
        if (!["customer", "retailer", "dealer"].includes(customerType) && discountVal > 50) {
          return NextResponse.json({ error: "High-level discount limit exceeded: Custom customer flat discounts cannot exceed 50%." }, { status: 400 });
        }

        const { ApprovalRequest } = await import("@/lib/models");
        const { notifyNewApprovalRequest } = await import("@/lib/telegram");

        // Check if there is already a pending approval request for this promotion
        const existing = await ApprovalRequest.findOne({
          type: "customer",
          targetId: id,
          status: "pending"
        });
        if (existing) {
          return NextResponse.json({ error: "A pending promotion consensus request already exists for this customer." }, { status: 400 });
        }

        // Store the targetDetails snapshot for consensus application
        const targetDetails = {
          customerType,
          flatDiscountPercent: !["customer", "retailer", "dealer"].includes(customerType) ? discountVal : undefined,
          flatDiscountExpiresAt: !["customer", "retailer", "dealer"].includes(customerType) && body.flatDiscountExpiresAt ? new Date(body.flatDiscountExpiresAt) : undefined
        };

        const approval = await ApprovalRequest.create({
          requesterEmail: currentUser.email,
          type: "customer",
          targetId: id,
          targetName: customer.name,
          field: "customerType",
          oldValue: customer.customerType,
          newValue: customerType,
          targetDetails,
          stage: "superadmin",
          superadminApprovals: [],
          ownerApproved: false
        });

        // Trigger Telegram alert to Superadmins
        await notifyNewApprovalRequest(approval);
        pendingApproval = true;
      }
    }

    if (status && ["active", "disabled"].includes(status)) {
      customer.status = status;
      // Force logout by incrementing version
      customer.tokenVersion = (customer.tokenVersion || 0) + 1;
    }

    if (pendingApproval) {
      await logAdminActivity({
        adminEmail: currentUser.email,
        action: "queue_customer_promotion",
        targetId: customer._id.toString(),
        targetName: customer.name,
        details: `Queued promotion request for customer ${customer.email}: Type ${oldType}->${customerType}`
      });

      return NextResponse.json({
        message: "Promotion queued for Superadmin consensus",
        pendingApproval: true
      });
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
        customerType: customer.customerType,
        flatDiscountPercent: customer.flatDiscountPercent,
        flatDiscountExpiresAt: customer.flatDiscountExpiresAt
      }
    });
  } catch (error: any) {
    console.error("Customer PATCH error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
