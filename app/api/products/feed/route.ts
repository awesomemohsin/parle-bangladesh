import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Product } from "@/lib/models";

export const dynamic = "force-dynamic";

// CSV escaping function
function escapeCSV(val: any) {
  if (val === null || val === undefined) return '';
  let str = String(val);
  // Replace newlines and carriage returns with spaces
  str = str.replace(/[\r\n]+/g, ' ');
  // If value contains comma, quotes, or double-quotes, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes(';')) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const feedSecret = process.env.FEED_SECRET_KEY || "parle_secure_feed_2026_key";

    if (secret !== feedSecret) {
      return NextResponse.json({ error: "Unauthorized: Invalid secret key" }, { status: 401 });
    }

    await connectDB();
    
    // Determine the base app URL dynamically from the request headers
    const host = request.headers.get("host") || "parlebangladesh.com";
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const appUrl = `${protocol}://${host}`;

    const products = await Product.find({}).lean();

    const headers = [
      'id',
      'item_group_id',
      'title',
      'description',
      'link',
      'image_link',
      'availability',
      'price',
      'condition',
      'brand',
      'category'
    ];

    let csvContent = headers.join(',') + '\n';

    for (const p of products) {
      const brand = p.brand || 'Parle';
      const category = p.category || 'Biscuits';
      const baseLink = `${appUrl}/shop/products/${p.slug}`;
      const description = p.description || `${p.name} - Premium quality biscuit from Parle Bangladesh.`;

      if (p.variations && p.variations.length > 0) {
        p.variations.forEach((v: any, index: number) => {
          const variantId = `${p._id.toString()}-${index}`;
          let title = p.name;
          if (v.flavor) {
            title += ` - ${v.flavor}`;
          }
          if (v.weight) {
            title += ` (${v.weight})`;
          }
          title = title.trim();
          
          let imageLink = '';
          if (v.image) {
            imageLink = v.image.startsWith('http') ? v.image : `${appUrl}${v.image}`;
          } else if (p.variations[0]?.image) {
            imageLink = p.variations[0].image.startsWith('http') ? p.variations[0].image : `${appUrl}${p.variations[0].image}`;
          } else {
            imageLink = `${appUrl}/logo.png`;
          }

          let variantLink = baseLink;
          const queryParams = [];
          if (v.weight) queryParams.push(`weight=${encodeURIComponent(v.weight)}`);
          if (v.flavor) queryParams.push(`flavor=${encodeURIComponent(v.flavor)}`);
          if (queryParams.length > 0) {
            variantLink += '?' + queryParams.join('&');
          }

          const price = `${v.price || 0} BDT`;
          const availability = (v.stock || 0) > 0 ? 'in stock' : 'out of stock';

          const row = [
            variantId,
            p._id.toString(),
            title,
            description,
            variantLink,
            imageLink,
            availability,
            price,
            'new',
            brand,
            category
          ];

          csvContent += row.map(escapeCSV).join(',') + '\n';
        });
      } else {
        const price = `${p.price || 0} BDT`;
        const availability = (p.stock || 0) > 0 ? 'in stock' : 'out of stock';
        const imageLink = `${appUrl}/logo.png`;

        const row = [
          p._id.toString(),
          p._id.toString(),
          p.name,
          description,
          baseLink,
          imageLink,
          availability,
          price,
          'new',
          brand,
          category
        ];

        csvContent += row.map(escapeCSV).join(',') + '\n';
      }
    }

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="products-feed.csv"',
      },
    });

  } catch (error: any) {
    console.error("Products Feed GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
