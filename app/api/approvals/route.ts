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

    const isHistory = status === 'all' || status === 'approved' || status === 'declined';
    
    if (user.role === ROLES.OWNER) {
        if (!isHistory) {
          // Owner daily view: requests that passed superadmin stage AND he hasn't signed
          query.stage = "owner";
          query.ownerApproved = false;
          query.status = "pending";
        } else {
          // Historical view: anything that reached his level or finished
          query.status = { $in: ["approved", "declined"] };
        }
    } else if (user.role === ROLES.SUPER_ADMIN) {
        if (!isHistory) {
          // Superadmin daily view: pending requests for his stage he hasn't signed yet
          query.stage = "superadmin";
          query.superadminApprovals = { $ne: userName };
          query.status = "pending";
        } else {
          // Historical view: anything approved or declined
          query.status = { $in: ["approved", "declined"] };
        }
    } else {
        return NextResponse.json({ error: "Forbidden: Higher authorization required" }, { status: 403 });
    }

    const requests = await ApprovalRequest.find(query).sort({ updatedAt: -1 }).lean();
    
    // Virtual Hydration: If old requests don't have targetDetails, fetch them now
    const { Order, Product } = require("@/lib/models");
    const hydratedRequests = await Promise.all(requests.map(async (req: any) => {
        if (!req.targetDetails) {
            try {
                if (req.type === 'order') {
                    const order = await Order.findById(req.targetId).lean();
                    if (order) req.targetDetails = order;
                } else if (req.type === 'product') {
                    const product = await Product.findById(req.targetId).lean();
                    if (product) req.targetDetails = product;
                }
            } catch (e) {
                console.error("Hydration error for request:", req._id, e);
            }
        }
        return req;
    }));

    return NextResponse.json({ requests: hydratedRequests });
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
