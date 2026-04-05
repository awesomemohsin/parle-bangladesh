import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Brand } from "@/lib/models";

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    
    let query = {};
    if (category) {
      query = { category };
    }

    const brands = await Brand.find(query).sort({ name: 1 });
    return NextResponse.json({
      brands: brands.map((b) => ({
        id: b._id.toString(),
        name: b.name,
        slug: b.slug,
        category: b.category,
        description: b.description,
        image: b.image,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const { name, category, description, image } = await req.json();

    if (!name || !category) {
      return NextResponse.json({ error: "Brand name and category are required" }, { status: 400 });
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");

    const existing = await Brand.findOne({ slug });
    if (existing) {
      return NextResponse.json({ error: "Brand with this name already exists" }, { status: 400 });
    }

    const brand = await Brand.create({
      name,
      slug,
      category,
      description,
      image,
    });

    return NextResponse.json({
      brand: {
        id: brand._id.toString(),
        name: brand.name,
        slug: brand.slug,
        category: brand.category,
        description: brand.description,
        image: brand.image,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
