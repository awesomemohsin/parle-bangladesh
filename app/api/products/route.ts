import { NextRequest, NextResponse } from "next/server";
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

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const categoryQuery = searchParams.get("category")?.toLowerCase();
    const searchQuery = searchParams.get("q")?.toLowerCase();
    const sortParam = searchParams.get("sort");
    const limitParam = parseInt(searchParams.get("limit") || "0");

    let query: any = {};
    if (categoryQuery && categoryQuery !== "all") {
      query.category = categoryQuery;
    }
    
    if (searchQuery) {
      query.$or = [
        { name: new RegExp(searchQuery, "i") },
        { description: new RegExp(searchQuery, "i") },
      ];
    }

    let sort: any = { createdAt: -1 };
    if (sortParam === "orders") {
      sort = { ordersCount: -1 };
    }

    let databaseQuery = Product.find(query, { images: 0 }).sort(sort);
    
    if (limitParam > 0) {
      databaseQuery = databaseQuery.limit(limitParam);
    }

    const products = await databaseQuery.lean();
    
    const response = NextResponse.json({ 
      products: products.map((p: any) => ({ ...p, id: p._id.toString(), _id: undefined })) 
    });

    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
    
    return response;
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
    
    const slug = body.slug || String(Date.now());
    
    let product = await Product.findOne({ slug });
    let action = "create_product";
    
    if (product) {
      action = "update_product";
      if (body.name) product.name = body.name;
      if (body.category) product.category = body.category;
      if (body.description) product.description = body.description;
      if (body.variations) product.variations = body.variations;
      if (body.images) product.images = body.images;
      await product.save();
    } else {
      product = new Product({
        name: body.name,
        slug: slug,
        category: body.category,
        description: body.description,
        variations: body.variations || [],
        images: body.images || [],
      });
      await product.save();
    }

    await logAdminActivity({
      adminEmail: user.email,
      action,
      targetId: product._id.toString(),
      targetName: product.name,
      details: `${action === 'create_product' ? 'Created' : 'Updated'} product: ${product.name} (${product.slug})`
    });

    return NextResponse.json({ product: mapDoc(product) }, { status: 201 });
  } catch (error) {
    console.error("Products POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
