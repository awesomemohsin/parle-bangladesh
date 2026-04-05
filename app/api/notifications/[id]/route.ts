import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/api-auth";
import connectDB from "@/lib/db";
import { Notification } from "@/lib/models";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const notification = await Notification.findById(id);

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    // Mark as read
    notification.isRead = true;
    await notification.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notification PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
