import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { StockLog } from "@/lib/models";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Auth Check
    const user = getAuthUserFromRequest(request);
    if (!user || !hasAnyRole(user, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MODERATOR])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get("q") || "";
    const reasonFilter = searchParams.get("reason") || "";
    const adminFilter = searchParams.get("admin") || "";
    const dateFilter = searchParams.get("date") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Filter construction
    const query: any = {};

    if (searchQuery) {
      query.$or = [
        { productName: new RegExp(searchQuery, "i") },
        { productIdString: new RegExp(searchQuery, "i") }, // fallback
      ];
    }

    if (reasonFilter) {
      query.reason = new RegExp(reasonFilter, "i");
    }

    if (adminFilter) {
      query.adminEmail = new RegExp(adminFilter, "i");
    }

    if (dateFilter) {
      const startOfDay = new Date(dateFilter);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateFilter);
      endOfDay.setHours(23, 59, 59, 999);
      query.createdAt = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }

    const total = await StockLog.countDocuments(query);
    const replenishmentsCount = await StockLog.countDocuments({ ...query, amount: { $gt: 0 } });
    const deductionsCount = await StockLog.countDocuments({ ...query, amount: { $lt: 0 } });

    const logs = await StockLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      logs: logs.map((log: any) => ({
        ...log,
        id: log._id.toString(),
        _id: undefined,
        __v: undefined,
      })),
      statistics: {
        total,
        replenishments: replenishmentsCount,
        deductions: deductionsCount
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error("StockLogs GET error:", error);
    return NextResponse.json({ error: "Internal server error: " + (error.message || "Unknown error") }, { status: 500 });
  }
}
