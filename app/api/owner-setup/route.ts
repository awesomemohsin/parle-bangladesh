import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db";
import { Admin } from "@/lib/models";
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const mongo = mongoose.connection.db;
    if (!mongo) {
      return NextResponse.json({ error: "DB connection not ready" }, { status: 500 });
    }
    const adminCollection = mongo.collection("admins");
    
    const ownerEmail = "owner@parle.com";
    const password = "owner123";
    const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
    
    // New Super Admin Setup
    const superAdminEmail = "mdmohsin.work@gmail.com";
    const superAdminPassword = "SuperAdmin@Parle2026!";
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
           { email: ownerEmail, pass: password, role: "owner" },
           { email: superAdminEmail, pass: superAdminPassword, role: "super_admin" }
        ],
        info: "Try logging in now."
    });
  } catch (error: any) {
    console.error("Owner setup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
