import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { LoginHistory } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    
    if (!user || !hasAnyRole(user, [ROLES.ADMIN, ROLES.MODERATOR, ROLES.SUPER_ADMIN, ROLES.OWNER])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // A user can only see their own login history unless they are an owner
    let query: any = { email: user.email };
    
    // If owner, they can optionally query by email to see others, otherwise they see their own
    const { searchParams } = new URL(request.url);
    const targetEmail = searchParams.get('email');
    if (targetEmail && user.role === ROLES.OWNER) {
      query = { email: targetEmail };
    }

    const sessions = await LoginHistory.find(query)
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Sessions GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
