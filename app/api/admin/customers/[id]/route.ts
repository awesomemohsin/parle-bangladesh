import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { User } from "@/lib/models";
import { logAdminActivity } from "@/lib/activity";

export async function PATCH(
  request: NextRequest,
  { params }: { params: any }
) {
  try {
    await connectDB();
    const currentUser = getAuthUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized. Please login again." }, { status: 401 });
    }
    
    // Only super_admin and owner can manage customers
    if (!hasAnyRole(currentUser, [ROLES.SUPER_ADMIN, ROLES.OWNER])) {
      return NextResponse.json({ error: "Access denied. SuperAdmin or Owner privileges required." }, { status: 403 });
    }

    // Handle params whether it is a Promise or a direct object (Next.js compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: "Customer ID is missing" }, { status: 400 });
    }

    const body = await request.json();
    const { customerType, status } = body;

    const customer = await User.findById(id);
    if (!customer) {
      return NextResponse.json({ error: `Customer with ID ${id} not found` }, { status: 404 });
    }

    const updates: any = {};
    if (customerType && ["retailer", "dealer"].includes(customerType)) {
      updates.customerType = customerType;
    }
    if (status && ["active", "disabled"].includes(status)) {
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid changes provided" }, { status: 400 });
    }

    const oldType = customer.customerType;
    const oldStatus = customer.status;

    // Apply updates
    if (updates.customerType) customer.customerType = updates.customerType;
    if (updates.status) customer.status = updates.status;
    
    await customer.save();

    // Log the activity
    await logAdminActivity({
      adminEmail: currentUser.email,
      action: "update_customer",
      targetId: customer._id.toString(),
      targetName: customer.name,
      details: `Updated customer ${customer.email}: Type ${oldType}->${customer.customerType}, Status ${oldStatus}->${customer.status}`
    });

    return NextResponse.json({ 
      message: "Customer updated successfully",
      customer: {
        id: customer._id.toString(),
        name: customer.name,
        email: customer.email,
        customerType: customer.customerType,
        status: customer.status
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error("Customer PATCH error:", error);
    return NextResponse.json({ 
      error: error.message || "Internal server error" 
    }, { status: 500 });
  }
}
