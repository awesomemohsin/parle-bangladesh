import { NextRequest, NextResponse } from "next/server";
import { ProductSchema } from "@/lib/schemas";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import { readProducts, upsertProduct } from "@/lib/data-store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category")?.toLowerCase();
    const query = searchParams.get("q")?.toLowerCase();

    let products = readProducts();

    if (category) {
      products = products.filter((p) => p.category.toLowerCase() === category);
    }

    if (query) {
      products = products.filter((p) => {
        const name = String(p.name || "").toLowerCase();
        const description = String(p.description || "").toLowerCase();
        return name.includes(query) || description.includes(query);
      });
    }

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Products GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAnyRole(user, [ROLES.ADMIN, ROLES.SUPER_ADMIN])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = ProductSchema.safeParse({
      ...body,
      price: Number(body.price),
      stock: Number(body.stock),
      rating: body.rating !== undefined ? Number(body.rating) : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid product payload" },
        { status: 400 },
      );
    }

    const product = upsertProduct(parsed.data);
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Products POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
