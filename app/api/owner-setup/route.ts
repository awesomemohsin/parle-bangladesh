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
                status: "active"
            }
        },
        { upsert: true }
    );

    return NextResponse.json({ 
        message: "Owner account successfully forced into Database collection via raw query", 
        email: ownerEmail,
        pass: password,
        role: "owner",
        info: "Try logging in now. If it still fails, restart 'npm run dev' to refresh models."
    });
  } catch (error: any) {
    console.error("Owner setup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
