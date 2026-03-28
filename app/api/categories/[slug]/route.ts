import { NextRequest, NextResponse } from "next/server";
import { CategorySchema } from "@/lib/schemas";
import { generateSlug } from "@/lib/api-helpers";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import {
  readCategories,
  readProducts,
  writeCategories,
} from "@/lib/data-store";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const categories = readCategories();
    const category = categories.find((c) => c.slug === slug);

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error("Category GET by slug error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const user = getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAnyRole(user, [ROLES.ADMIN, ROLES.SUPER_ADMIN])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { slug } = await params;
    const body = await request.json();
    const parsed = CategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || "Invalid category payload",
        },
        { status: 400 },
      );
    }

    const categories = readCategories();
    const index = categories.findIndex((c) => c.slug === slug);

    if (index === -1) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    const nextSlug = generateSlug(parsed.data.name);
    if (categories.some((c, i) => i !== index && c.slug === nextSlug)) {
      return NextResponse.json(
        { error: "Category name already exists" },
        { status: 409 },
      );
    }

    const updated = {
      ...categories[index],
      ...parsed.data,
      slug: nextSlug,
      updatedAt: new Date().toISOString(),
    };

    categories[index] = updated;
    const saved = writeCategories(categories);

    if (!saved) {
      return NextResponse.json(
        { error: "Failed to update category" },
        { status: 500 },
      );
    }

    return NextResponse.json({ category: updated });
  } catch (error) {
    console.error("Category PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAnyRole(user, [ROLES.ADMIN, ROLES.SUPER_ADMIN])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { slug } = await params;
    const categories = readCategories();
    const category = categories.find((c) => c.slug === slug);

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    const products = readProducts();
    const hasProducts = products.some(
      (p) =>
        p.category.toLowerCase() === slug ||
        p.category.toLowerCase() === category.name.toLowerCase(),
    );

    if (hasProducts) {
      return NextResponse.json(
        { error: "Cannot delete category with existing products" },
        { status: 400 },
      );
    }

    const filtered = categories.filter((c) => c.slug !== slug);
    const saved = writeCategories(filtered);

    if (!saved) {
      return NextResponse.json(
        { error: "Failed to delete category" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Category DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
