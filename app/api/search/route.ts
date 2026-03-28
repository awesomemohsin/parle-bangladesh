import { NextRequest, NextResponse } from "next/server";
import { readProducts } from "@/lib/data-store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    if (!q) {
      return NextResponse.json({ products: [] });
    }

    const products = readProducts().filter((product) => {
      const name = String(product.name || "").toLowerCase();
      const description = String(product.description || "").toLowerCase();
      const category = String(product.category || "").toLowerCase();
      return (
        name.includes(q) || description.includes(q) || category.includes(q)
      );
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Search GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
