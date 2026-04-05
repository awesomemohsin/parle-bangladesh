import { NextRequest, NextResponse } from "next/server";
import { CategorySchema } from "@/lib/schemas";
import { generateSlug } from "@/lib/api-helpers";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Category } from "@/lib/models";
import { logAdminActivity } from "@/lib/activity";

function mapDoc(doc: any) {
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
}

export async function GET() {
  try {
    await connectDB();
    const categories = await Category.find().lean();
    const response = NextResponse.json({ 
      categories: categories.map((c: any) => { c.id = c._id.toString(); return c; }) 
    });
    
    // Cache categories for 1 hour as they change infrequently
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
    
    return response;
  } catch (error) {
    console.error("Categories GET error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasAnyRole(user, [ROLES.ADMIN, ROLES.SUPER_ADMIN])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const parsed = CategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid category payload" }, { status: 400 });
    }

    const slug = generateSlug(parsed.data.name);
    const existing = await Category.findOne({ slug });

    if (existing) {
      return NextResponse.json({ error: "Category already exists" }, { status: 409 });
    }

    const category = new Category({ ...parsed.data, slug });
    await category.save();

    // Log administrative activity
    await logAdminActivity({
      adminEmail: user.email,
      action: "create_category",
      targetId: category._id.toString(),
      targetName: category.name,
      details: `Created category: ${category.name} (${category.slug})`
    });

    return NextResponse.json({ category: mapDoc(category) }, { status: 201 });
  } catch (error) {
    console.error("Categories POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
