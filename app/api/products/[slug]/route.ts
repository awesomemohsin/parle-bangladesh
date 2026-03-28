import { NextRequest, NextResponse } from "next/server";
import { ProductSchema } from "@/lib/schemas";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Product } from "@/lib/models";

function mapDoc(doc: any) {
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
}

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { slug } = await params;
    const productDoc = await Product.findOne({ slug });

    if (!productDoc) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product: mapDoc(productDoc) });
  } catch (error) {
    console.error("Product GET by slug error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasAnyRole(user, [ROLES.ADMIN, ROLES.SUPER_ADMIN])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { slug } = await params;
    const existing = await Product.findOne({ slug });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
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

    Object.assign(existing, parsed.data);
    await existing.save();

    return NextResponse.json({ product: mapDoc(existing) });
  } catch (error) {
    console.error("Product PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasAnyRole(user, [ROLES.ADMIN, ROLES.SUPER_ADMIN])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { slug } = await params;
    const deleted = await Product.findOneAndDelete({ slug });
    if (!deleted) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Product DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
