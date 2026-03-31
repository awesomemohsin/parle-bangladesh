import { NextRequest, NextResponse } from "next/server";
import { ProductSchema } from "@/lib/schemas";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Product } from "@/lib/models";
import { logAdminActivity } from "@/lib/activity";

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

import fs from "fs";
import path from "path";
import { Category } from "@/lib/models";

export async function GET(_: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { slug } = await params;
    const productDoc = await Product.findOne({ slug });

    if (!productDoc) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get the category name for path construction
    const categoryDoc = await Category.findOne({ slug: productDoc.category });
    const categoryName = categoryDoc ? categoryDoc.name : "Uncategorized";

    const product = mapDoc(productDoc);

    // Build local path to check for images
    // Path: /public/images/category-slug/product-slug/
    // Example: /public/images/biscuits/parle-g-gold/
    const categorySlug = productDoc.category; // Now always a slug
    const productSlug = productDoc.slug;
    
    const relativeDirPath = path.join("images", categorySlug, productSlug);
    const absoluteDirPath = path.join(process.cwd(), "public", relativeDirPath);

    let images: string[] = [];
    if (fs.existsSync(absoluteDirPath)) {
      try {
        const files = fs.readdirSync(absoluteDirPath);
        images = files
          .filter((f) => /\.(webp|jpg|jpeg|png|svg)$/i.test(f))
          .sort((a, b) => {
            const numA = parseInt(a);
            const numB = parseInt(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
          })
          .map((f) => `/${relativeDirPath.replace(/\\/g, "/")}/${f}`);
      } catch (err) {
        console.error("Error reading product directory:", err);
      }
    }

    // Fallback: If no filesystem images, use the ones in DB
    if (images.length === 0 && productDoc.images && productDoc.images.length > 0) {
      images = productDoc.images;
    }

    return NextResponse.json({ product, images });
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
    
    // We update values from body. Price/Stock are now in variations.
    // If body contains top level price/stock, we ignore them or map them to the first variation.
    if (body.variations) {
      existing.variations = body.variations;
    }
    
    if (body.name) existing.name = body.name;
    if (body.category) existing.category = body.category;
    if (body.description) existing.description = body.description;
    if (body.images) existing.images = body.images;

    await existing.save();

    // Log administrative activity
    await logAdminActivity({
      adminEmail: user.email,
      action: "update_product",
      targetId: existing._id.toString(),
      targetName: existing.name,
      details: `Updated product: ${existing.name} (${existing.slug})`
    });

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

    // Log administrative activity
    await logAdminActivity({
      adminEmail: user.email,
      action: "delete_product",
      targetId: deleted._id.toString(),
      targetName: deleted.name,
      details: `Deleted product: ${deleted.name} (${deleted.slug})`
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Product DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
