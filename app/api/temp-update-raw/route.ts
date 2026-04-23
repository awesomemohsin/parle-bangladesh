import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import mongoose from "mongoose";

export async function GET() {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const collection = db.collection("job_circulars");
    
    const result = await collection.updateOne(
      { title: "Territory Sales Officer" },
      { 
        $set: { 
          salaryRange: "Negotiable",
          benefits: ["T/A, D/A, Mobile bill", "Salary Review: Yearly", "Festival Bonus: 2"],
          updatedAt: new Date()
        } 
      }
    );

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
