import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUser, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Product, User, PromoCode } from "@/lib/models";
import { logAdminActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

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
    
    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const skip = (page - 1) * limit;

    let query: any = {};
    if (categoryQuery && categoryQuery !== "all") {
      query.category = categoryQuery;
    }
    
    if (searchQuery) {
      query.$or = [
        { name: new RegExp(searchQuery, "i") },
        { slug: new RegExp(searchQuery, "i") },
      ];
    }

    let sort: any = { createdAt: -1 };
    if (sortParam === "orders") {
      sort = { ordersCount: -1 };
    } else if (sortParam === "price_asc") {
      sort = { "variations.0.price": 1 };
    } else if (sortParam === "price_desc") {
      sort = { "variations.0.price": -1 };
    }

    const total = await Product.countDocuments(query);
    
    const products = await Product.find(query, { images: { $slice: 1 } })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Deep verification: checks tokenVersion
    const user = await getVerifiedAuthUser(request);
    let isPrivileged = false;
    
    if (user) {
      if ([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MODERATOR].includes(user.role as any)) {
        isPrivileged = true;
      } 
      else if (user.customerType === "dealer") {
        // We already did a deep check in getVerifiedAuthUser, but we need to ensure the user is STILL a dealer in DB
        const dbUser = await User.findById(user.id).select("customerType").lean();
        if (dbUser && dbUser.customerType === "dealer") {
          isPrivileged = true;
        }
      }
    }

    // 1. Fetch all active flat discounts
    const flatDiscounts = await PromoCode.find({ type: 'flat', isActive: true }).lean();

    const response = NextResponse.json({ 
      products: products.map((p: any) => {
        const product = { ...p, id: p._id.toString(), _id: undefined };
        
        // 2. Apply flat discounts to each product
        if (product.variations) {
          product.variations = product.variations.map((v: any) => {
            const variation = { ...v };
            
            // Logic: Option A (Best Value)
            // Find ALL applicable flat discounts and pick the one with max savings
            const applicableFlats = flatDiscounts.filter(d => 
              d.allProducts || (d.applicableProducts && d.applicableProducts.includes(product.id))
            );

            if (applicableFlats.length > 0) {
              const originalPrice = Number(isPrivileged && variation.dealerPrice ? variation.dealerPrice : variation.price);
              let bestSavings = 0;
              let bestDiscountedPrice = originalPrice;
              let bestDiscountAmount = 0;
              let bestDiscountType = 'fixed';

              applicableFlats.forEach(rule => {
                const amount = Number(rule.discountAmount || 0);
                let currentDiscounted = originalPrice;
                let currentSavings = 0;

                if (rule.discountType === 'percentage') {
                  currentSavings = (originalPrice * amount) / 100;
                  currentDiscounted = originalPrice - currentSavings;
                } else {
                  currentSavings = amount;
                  currentDiscounted = Math.max(0, originalPrice - amount);
                }

                if (currentSavings > bestSavings) {
                  bestSavings = currentSavings;
                  bestDiscountedPrice = currentDiscounted;
                  bestDiscountAmount = amount;
                  bestDiscountType = rule.discountType;
                }
              });

              variation.flatDiscountPrice = Math.round(bestDiscountedPrice);
              variation.hasFlatDiscount = true;
              variation.flatDiscountAmount = bestDiscountAmount;
              variation.flatDiscountType = bestDiscountType;
            }

            if (!isPrivileged) {
              delete variation.dealerPrice;
            }
            return variation;
          });
        }
        return product;
      }),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (error: any) {
    console.error("Products GET error:", error);
    return NextResponse.json({ error: "Internal server error: " + (error.message || "Unknown error") }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getVerifiedAuthUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const isAllowed = [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MODERATOR].includes(user.role as any);
    if (!isAllowed) {
        return NextResponse.json({ error: "Restricted: Insufficient permissions." }, { status: 403 });
    }

    const body = await request.json();
    const slug = body.slug || String(Date.now());
    
    let product = await Product.findOne({ slug });
    let action = "create_product";
    
    if (product) {
      action = "update_product";
      if (body.name) product.name = body.name;
      if (body.category) product.category = body.category;
      if (body.brand) product.brand = body.brand;
      if (body.description) product.description = body.description;
      if (body.variations) product.variations = body.variations;
      if (body.images) product.images = body.images;
      await product.save();
    } else {
      product = new Product({
        name: body.name,
        slug: slug,
        category: body.category,
        brand: body.brand,
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
      details: `${action === 'create_product' ? 'Created' : 'Updated'} product: ${product.name}`
    });

    return NextResponse.json({ product: mapDoc(product) }, { status: 201 });
  } catch (error: any) {
    console.error("Products POST error:", error);
    return NextResponse.json({ error: "Internal server error: " + (error.message || "Unknown error") }, { status: 500 });
  }
}
