import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { JobCircular } from "@/lib/models";

export async function GET() {
  try {
    await connectDB();
    
    // Update Territory Sales Officer
    const result = await JobCircular.updateOne(
      { title: "Territory Sales Officer" },
      { 
        $set: { 
          salaryRange: "Negotiable",
          benefits: ["T/A, D/A, Mobile bill", "Salary Review: Yearly", "Festival Bonus: 2"] 
        } 
      }
    );

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
