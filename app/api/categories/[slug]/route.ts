import { NextRequest, NextResponse } from "next/server";
import { CategorySchema } from "@/lib/schemas";
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

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { slug } = await params;
    const categoryDoc = await Category.findOne({ slug });

    if (!categoryDoc) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({ category: mapDoc(categoryDoc) });
  } catch (error) {
    console.error("Category GET by slug error:", error);
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
    const existing = await Category.findOne({ slug });
    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = CategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid category payload" },
        { status: 400 },
      );
    }

    Object.assign(existing, parsed.data);
    await existing.save();

    // Log administrative activity
    await logAdminActivity({
      adminEmail: user.email,
      action: "update_category",
      targetId: existing._id.toString(),
      targetName: existing.name,
      details: `Updated category: ${existing.name} (${existing.slug})`
    });

    return NextResponse.json({ category: mapDoc(existing) });
  } catch (error) {
    console.error("Category PUT error:", error);
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
    const deleted = await Category.findOneAndDelete({ slug });
    if (!deleted) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Log administrative activity
    await logAdminActivity({
      adminEmail: user.email,
      action: "delete_category",
      targetId: deleted._id.toString(),
      targetName: deleted.name,
      details: `Deleted category: ${deleted.name} (${deleted.slug})`
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Category DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
