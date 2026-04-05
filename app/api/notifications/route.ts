import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/api-auth";
import connectDB from "@/lib/db";
import { Notification } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const query: any = {
      $or: [
        { userId: user.id },
        { role: user.role }
      ]
    };

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(20);

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
