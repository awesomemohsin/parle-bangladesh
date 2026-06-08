import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Product, PromoCode } from "@/lib/models";

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
    
    const appUrl = "https://parlebangladesh.com";

    // Load active flat discounts to apply globally in feed
    const flatDiscounts = await PromoCode.find({ type: 'flat', isActive: true }).lean();
    const products = await Product.find({}).sort({ serial: 1, createdAt: -1 }).lean();

    const headers = [
      'id',
      'item_group_id',
      'title',
      'description',
      'link',
      'image_link',
      'availability',
      'price',
      'sale_price',
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

          // Resolve discount prices (variation-specific or global flat campaigns)
          let salePriceVal = v.discountPrice || 0;
          const productIdStr = p._id.toString();
          const varKey = `${productIdStr}:${(v.weight || '').toString().trim().toLowerCase()}:${(v.flavor || '').toString().trim().toLowerCase()}`;
          const applicableFlat = flatDiscounts.find(d => 
            d.allProducts || (
              d.applicableProducts && d.applicableProducts.some((id: any) => id.toString() === productIdStr) && (
                !d.applicableVariations ||
                d.applicableVariations.length === 0 ||
                d.applicableVariations.map((val: string) => val.trim().toLowerCase()).includes(varKey.trim().toLowerCase())
              )
            )
          );

          if (applicableFlat) {
            const amount = Number(applicableFlat.discountAmount || 0);
            const originalPrice = Number(v.price || 0);
            let flatDiscounted = originalPrice;
            
            if (applicableFlat.discountType === 'percentage') {
              flatDiscounted = originalPrice - (originalPrice * amount) / 100;
            } else {
              flatDiscounted = Math.max(0, originalPrice - amount);
            }
            flatDiscounted = Math.round(flatDiscounted);

            if (flatDiscounted < (salePriceVal || v.price)) {
              salePriceVal = flatDiscounted;
            }
          }

          const salePrice = (salePriceVal > 0 && salePriceVal < v.price) 
            ? `${salePriceVal} BDT` 
            : '';

          const row = [
            variantId,
            p._id.toString(),
            title,
            description,
            variantLink,
            imageLink,
            availability,
            price,
            salePrice,
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

        // Resolve discount prices (product-level or global flat campaigns)
        let salePriceVal = p.discountPrice || 0;
        const productIdStr = p._id.toString();
        const applicableFlat = flatDiscounts.find(d => 
          d.allProducts || (d.applicableProducts && d.applicableProducts.some((id: any) => id.toString() === productIdStr))
        );

        if (applicableFlat) {
          const amount = Number(applicableFlat.discountAmount || 0);
          const originalPrice = Number(p.price || 0);
          let flatDiscounted = originalPrice;
          
          if (applicableFlat.discountType === 'percentage') {
            flatDiscounted = originalPrice - (originalPrice * amount) / 100;
          } else {
            flatDiscounted = Math.max(0, originalPrice - amount);
          }
          flatDiscounted = Math.round(flatDiscounted);

          if (flatDiscounted < (salePriceVal || p.price)) {
            salePriceVal = flatDiscounted;
          }
        }

        const salePrice = (salePriceVal > 0 && salePriceVal < p.price) 
          ? `${salePriceVal} BDT` 
          : '';

        const row = [
          p._id.toString(),
          p._id.toString(),
          p.name,
          description,
          baseLink,
          imageLink,
          availability,
          price,
          salePrice,
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
