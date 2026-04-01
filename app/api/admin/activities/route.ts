import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { AdminActivity } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    
    // Only SUPER_ADMIN and OWNER can view/delete activity logs
    if (!user || !hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.OWNER])) {
      return NextResponse.json({ error: "Forbidden. Authorization Level 4 Access Required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const action = searchParams.get("action");
    const date = searchParams.get("date");
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");

    let query: any = {};
    if (email) query.adminEmail = new RegExp(email, "i");
    if (action) query.action = action;
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      query.createdAt = { $gte: start, $lt: end };
    }

    const activities = await AdminActivity.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    const total = await AdminActivity.countDocuments(query);

    return NextResponse.json({
      activities,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Admin Activities GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    
    // Only SUPER_ADMIN can delete activity logs
    if (!user || !hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.OWNER])) {
      return NextResponse.json({ error: "Forbidden. Super Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const all = searchParams.get("all") === "true";

    if (all) {
      await AdminActivity.deleteMany({});
      return NextResponse.json({ success: true, message: "All activity logs cleared." });
    }

    if (id) {
      await AdminActivity.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Missing id or all parameter" }, { status: 400 });
  } catch (error) {
    console.error("Admin Activities DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
