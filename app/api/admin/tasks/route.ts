import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUser } from "@/lib/api-auth";
import { ROLES, ORDER_STATUS } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Order, ApprovalRequest, ContactSubmission, CareerApplication } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // DEEP VERIFICATION: Checks tokenVersion
    const user = await getVerifiedAuthUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const results: any = { pendingOrders: 0, processingOrders: 0, pendingApprovals: 0, unseenContacts: 0, pendingApplications: 0 };

    // Hierarchy based access
    const isHighLevel = user.role === ROLES.SUPER_ADMIN || user.role === ROLES.OWNER;
    const isStaff = user.role === ROLES.ADMIN || user.role === ROLES.MODERATOR;

    // Fetch order counts for everyone authorised to see them
    if (isHighLevel || isStaff) {
       if (user.role === ROLES.MODERATOR) {
         results.pendingOrders = 0; // Moderators restricted to processing only
       } else {
         results.pendingOrders = await Order.countDocuments({ status: ORDER_STATUS.PENDING });
       }
       results.processingOrders = await Order.countDocuments({ status: ORDER_STATUS.PROCESSING });
    }

    // Fetch unseen contact count for authorized roles
    if (isHighLevel || user.role === ROLES.ADMIN) {
      results.unseenContacts = await ContactSubmission.countDocuments({ isSeen: false });
      results.pendingApplications = await CareerApplication.countDocuments({ isSeen: false });
    }

    // Fetch approvals for high level users
    if (isHighLevel) {
      const userName = (user.name || user.email || "Unknown").toLowerCase();
      const query: any = { status: "pending" };
      
      if (user.role === ROLES.OWNER) {
        query.stage = "owner";
        query.ownerApproved = false;
      } else {
        query.stage = "superadmin";
        query.superadminApprovals = { $ne: userName };
      }
      results.pendingApprovals = await ApprovalRequest.countDocuments(query);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Tasks API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
