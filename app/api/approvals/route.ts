import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { ApprovalRequest } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // 'product' or 'order'
    const status = searchParams.get("status") || "pending";

    const query: any = {};
    if (status !== 'all') query.status = status;
    if (type) query.type = type;

    // Zero-Bother Identity Filtering
    const userName = (user.name || user.email || "Unknown").toLowerCase();

    if (user.role === ROLES.OWNER) {
        // Owner only sees requests that PASSED superadmin verify stage AND he hasn't signed
        query.stage = "owner";
        query.ownerApproved = false;
    } else if (user.role === ROLES.SUPER_ADMIN) {
        // Superadmin only sees pending requests for his stage he hasn't signed yet
        query.stage = "superadmin";
        query.superadminApprovals = { $ne: userName };
        query.status = "pending";
    } else {
        return NextResponse.json({ error: "Forbidden: Higher authorization required" }, { status: 403 });
    }

    const requests = await ApprovalRequest.find(query).sort({ updatedAt: -1 });
    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Approvals GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { type, targetId, targetName, field, oldValue, newValue, variationIndex } = body;

    if (!type || !targetId || !targetName || !field || oldValue === undefined || newValue === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const approvalRequest = new ApprovalRequest({
      requesterEmail: user.email,
      type,
      targetId,
      targetName,
      field,
      oldValue: String(oldValue),
      newValue: String(newValue),
      variationIndex,
      status: "pending",
      stage: "superadmin",
    });

    await approvalRequest.save();
    return NextResponse.json({ message: "Approval request created", request: approvalRequest }, { status: 201 });
  } catch (error) {
    console.error("Approvals POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
