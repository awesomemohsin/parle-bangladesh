import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/api-auth";
import { ROLES, ORDER_STATUS } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Order, ApprovalRequest } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const results: any = { pendingOrders: 0, processingOrders: 0, pendingApprovals: 0 };

    if (user.role === ROLES.ADMIN) {
      results.pendingOrders = await Order.countDocuments({ status: ORDER_STATUS.PENDING });
    } else if (user.role === ROLES.MODERATOR) {
      results.processingOrders = await Order.countDocuments({ status: ORDER_STATUS.PROCESSING });
    } else if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.OWNER) {
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
