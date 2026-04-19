import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import mongoose from "mongoose";

export async function GET() {
  try {
    const startTime = Date.now();
    await connectDB();
    const dbStatus = mongoose.connection.readyState;
    const latency = Date.now() - startTime;

    const statusMap: Record<number, string> = {
      0: "Disconnected",
      1: "Connected",
      2: "Connecting",
      3: "Disconnecting",
      99: "Uninitialized"
    };

    return NextResponse.json({
      status: "online",
      database: statusMap[dbStatus] || "Unknown",
      latency: `${latency}ms`,
      timestamp: new Date().toISOString(),
      version: "1.2.0-stable"
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      error: error.message || "Database connection failed",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
