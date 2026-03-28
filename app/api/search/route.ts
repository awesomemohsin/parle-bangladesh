import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Product } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q) {
      return NextResponse.json({ products: [] });
    }

    const regex = new RegExp(q, "i");
    const products = await Product.find({
      $or: [
        { name: regex },
        { description: regex },
        { category: regex }
      ]
    }).lean();

    return NextResponse.json({ 
      products: products.map(p => { 
        p.id = p._id.toString(); 
        delete (p as any)._id; 
        return p; 
      }) 
    });
  } catch (error) {
    console.error("Search GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
