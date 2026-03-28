import { NextRequest, NextResponse } from "next/server";
import { ProductSchema } from "@/lib/schemas";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Product, Category } from "@/lib/models";

function mapDoc(doc: any) {
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const categoryQuery = searchParams.get("category")?.toLowerCase();
    const searchQuery = searchParams.get("q")?.toLowerCase();

    let query: any = {};
    if (categoryQuery) query.category = new RegExp(`^${categoryQuery}$`, "i");
    if (searchQuery) {
      query.$or = [
        { name: new RegExp(searchQuery, "i") },
        { description: new RegExp(searchQuery, "i") },
      ];
    }

    const products = await Product.find(query).lean();
    return NextResponse.json({ products: products.map(p => { p.id = p._id.toString(); return p; }) });
  } catch (error) {
    console.error("Products GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasAnyRole(user, [ROLES.ADMIN, ROLES.SUPER_ADMIN])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

    // Upsert behavior based on slug or created if new
    const slug = parsed.data.slug || String(Date.now());
    
    let product = await Product.findOne({ slug });
    if (product) {
      Object.assign(product, parsed.data);
      await product.save();
    } else {
      product = new Product({ ...parsed.data, slug });
      await product.save();
    }

    return NextResponse.json({ product: mapDoc(product) }, { status: 201 });
  } catch (error) {
    console.error("Products POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
