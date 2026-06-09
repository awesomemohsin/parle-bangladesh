import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db";
import { User, Admin } from "@/lib/models";
import { generateToken, setAuthCookie, getTokenFromCookie } from "@/lib/auth";
import { getVerifiedAuthUser } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { name, email, mobile, password } = body;

    if (!name || !mobile || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const mobileRegex = /^01[3-9]\d{8}$/;
    if (!mobileRegex.test(mobile)) {
      return NextResponse.json({ error: "Invalid Bangladeshi mobile format" }, { status: 400 });
    }

    const emailLower = (email && email.trim() !== "")
      ? email.toLowerCase()
      : `${mobile}@phone.parle.com`;

    // Check both User and Admin collections to prevent duplicates across roles
    const existingUser = await User.findOne({
      $or: [{ email: emailLower }, { mobile }]
    });
    const existingAdmin = await Admin.findOne({
      $or: [{ email: emailLower }, { mobile }]
    });

    if (existingUser || existingAdmin) {
      return NextResponse.json({ error: "Email or Mobile already in use" }, { status: 400 });
    }

    // If registered by a logged-in SR, set referral and customer type automatically
    let referredBySR = undefined;
    let creatorEmail = "";
    let customerType = "customer";
    const srToken = getTokenFromCookie(request.headers.get("cookie")) || request.headers.get("authorization")?.slice(7);
    if (srToken) {
      const creator = await getVerifiedAuthUser(request);
      if (creator) {
        const dbCreator = await User.findById(creator.id).lean() as any;
        if (dbCreator && dbCreator.isSR) {
          referredBySR = dbCreator._id;
          creatorEmail = dbCreator.email;
          customerType = "retailer";
        }
      }
    }

    const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
    const user = await User.create({
      name,
      email: emailLower,
      mobile,
      password: passwordHash,
      role: "customer",
      referredBySR,
      customerType,
      creditLimit: customerType === "retailer" ? 10000 : undefined,
      isRetailerApproved: false, // Default to probation retailer
    });

    // Automatically queue retailer promotion consensus request if registered by an SR
    if (referredBySR && creatorEmail) {
      try {
        const { ApprovalRequest } = await import("@/lib/models");
        const { notifyNewApprovalRequest } = await import("@/lib/telegram");

        const approval = await ApprovalRequest.create({
          requesterEmail: creatorEmail,
          type: "customer",
          targetId: user._id.toString(),
          targetName: user.name,
          field: "isRetailerApproved",
          oldValue: "Probation Retailer",
          newValue: "Approved Retailer",
          targetDetails: { isRetailerApproved: true, creditLimit: 999999999 },
          stage: "superadmin",
          superadminApprovals: [],
          ownerApproved: false
        });

        await notifyNewApprovalRequest(approval);
      } catch (err) {
        console.error("[Signup] Failed to create or notify retailer promotion request:", err);
      }
    }

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        isSR: user.isSR || false,
      },
      message: "Signup successful",
    }, { status: 201 });

    if (!referredBySR) {
      response.headers.set("Set-Cookie", setAuthCookie(token));
    }
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

