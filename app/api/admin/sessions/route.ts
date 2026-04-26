import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { LoginHistory, RefreshToken } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    
    if (!user || !hasAnyRole(user, [ROLES.ADMIN, ROLES.MODERATOR, ROLES.SUPER_ADMIN, ROLES.OWNER])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'history';

    if (mode === 'active') {
       let query: any = { userId: user.id };
       if (hasAnyRole(user, [ROLES.OWNER, ROLES.SUPER_ADMIN])) {
          query = {};
       }
       const activeSessions = await RefreshToken.find(query).sort({ createdAt: -1 }).lean();
       return NextResponse.json(activeSessions);
    }

    let query: any = { email: user.email };
    if (hasAnyRole(user, [ROLES.OWNER, ROLES.SUPER_ADMIN])) {
      const targetEmail = searchParams.get('email');
      if (targetEmail) query = { email: targetEmail };
      else query = {};
    }

    const sessions = await LoginHistory.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Sessions GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    
    if (!user || !hasAnyRole(user, [ROLES.OWNER, ROLES.SUPER_ADMIN])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    await RefreshToken.findByIdAndDelete(sessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sessions DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
