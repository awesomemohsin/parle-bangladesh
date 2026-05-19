import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db";
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const mongo = mongoose.connection.db;
    if (!mongo) {
      return NextResponse.json({ error: "DB connection not ready" }, { status: 500 });
    }
    const adminCollection = mongo.collection("admins");
    
    // Load credentials from environment variables securely
    const ownerEmail = process.env.INITIAL_OWNER_EMAIL;
    const ownerPassword = process.env.INITIAL_OWNER_PASSWORD;
    const superAdminEmail = process.env.INITIAL_ADMIN_EMAIL;
    const superAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;

    // Fail-safe: Block execution if environment variables are not configured (especially in production)
    if (!ownerEmail || !ownerPassword || !superAdminEmail || !superAdminPassword) {
      return NextResponse.json(
        { error: "Setup credentials are not configured in environment variables." },
        { status: 400 }
      );
    }
    
    const passwordHash = crypto.createHash("sha256").update(ownerPassword).digest("hex");
    const superAdminPasswordHash = crypto.createHash("sha256").update(superAdminPassword).digest("hex");
    
    // UPSERT directly using collection to bypass Database enums
    await adminCollection.updateOne(
        { email: ownerEmail },
        { 
            $set: {
                name: "Parle Owner",
                email: ownerEmail,
                mobile: "01700000000",
                password: passwordHash,
                role: "owner",
                status: "active",
                updatedAt: new Date()
            },
            $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
    );

    await adminCollection.updateOne(
        { email: superAdminEmail },
        { 
            $set: {
                name: "Mohsin",
                email: superAdminEmail,
                mobile: "01800000000",
                password: superAdminPasswordHash,
                role: "super_admin",
                status: "active",
                updatedAt: new Date()
            },
            $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
    );

    return NextResponse.json({ 
        message: "Accounts successfully forced into Database collection via raw query", 
        accounts: [
           { email: ownerEmail, pass: "[HIDDEN - CHECK ENV]", role: "owner" },
           { email: superAdminEmail, pass: "[HIDDEN - CHECK ENV]", role: "super_admin" }
         ],
        info: "Try logging in now."
    });
  } catch (error: any) {
    console.error("Owner setup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

