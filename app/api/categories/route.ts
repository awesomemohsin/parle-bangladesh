import { NextRequest, NextResponse } from "next/server";
import { CategorySchema } from "@/lib/schemas";
import { generateSlug } from "@/lib/api-helpers";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import {
  createCategory,
  readCategories,
  writeCategories,
} from "@/lib/data-store";

export async function GET() {
  try {
    const categories = readCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Categories GET error:", error);
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
    const slug = generateSlug(parsed.data.name);

    if (categories.some((c) => c.slug === slug)) {
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 409 },
      );
    }

    const category = createCategory(parsed.data);
    const saved = writeCategories([...categories, category]);

    if (!saved) {
      return NextResponse.json(
        { error: "Failed to save category" },
        { status: 500 },
      );
    }

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Categories POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
