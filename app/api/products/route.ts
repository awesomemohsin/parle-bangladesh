import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUser, getEffectiveUserContext, hasAnyRole } from "@/lib/api-auth";
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
      // Leverage MongoDB text index for fast full-word searches
      query.$text = { $search: searchQuery };
    }

    let sort: any = { serial: 1, createdAt: -1 };
    if (sortParam === "orders") {
      sort = { ordersCount: -1 };
    } else if (sortParam === "price_asc") {
      sort = { "variations.0.price": 1 };
    } else if (sortParam === "price_desc") {
      sort = { "variations.0.price": -1 };
    }

    let total = await Product.countDocuments(query);

    // Fallback to substring regex search for partial typing if text search yields 0 matches
    if (searchQuery && total === 0) {
      delete query.$text;
      query.$or = [
        { name: new RegExp(searchQuery, "i") },
        { slug: new RegExp(searchQuery, "i") },
      ];
      total = await Product.countDocuments(query);
    }
    
    const products = await Product.find(query, { images: { $slice: 1 } })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Resolve effective context (impersonation support)
    const context = await getEffectiveUserContext(request);
    const user = context?.user;
    let showDealerPrice = false;
    let showRetailerPrice = false;
    let showCorporatePrice = false;
    
    let userFlatDiscountPercent = 0;
    if (user) {
      if ([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MODERATOR].includes(user.role as any)) {
        showDealerPrice = true;
        showRetailerPrice = true;
        showCorporatePrice = true;
      }
      if (user.customerType === "dealer" || user.customerType === "employee") {
        showDealerPrice = true;
      } else if (user.customerType === "retailer") {
        showRetailerPrice = true;
      } else if (user.customerType === "corporate") {
        showCorporatePrice = true;
      }
      
      if (user.flatDiscountPercent && user.flatDiscountExpiresAt && new Date(user.flatDiscountExpiresAt) > new Date()) {
        userFlatDiscountPercent = user.flatDiscountPercent;
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
            const applicableFlats = flatDiscounts.filter(d => {
              const varKey = `${product.id}:${(variation.weight || '').toString().trim().toLowerCase()}:${(variation.flavor || '').toString().trim().toLowerCase()}`;
              return d.allProducts || (
                d.applicableProducts && d.applicableProducts.some((id: any) => id.toString() === product.id) && (
                  !d.applicableVariations ||
                  d.applicableVariations.length === 0 ||
                  d.applicableVariations.map((val: string) => val.trim().toLowerCase()).includes(varKey.trim().toLowerCase())
                )
              );
            });

            if (applicableFlats.length > 0 || userFlatDiscountPercent > 0) {
              const originalPrice = Number(
                (showDealerPrice && variation.dealerPrice)
                  ? variation.dealerPrice
                  : (showRetailerPrice && variation.retailerPrice)
                  ? variation.retailerPrice
                  : (showCorporatePrice && variation.corporatePrice)
                  ? variation.corporatePrice
                  : variation.price
              );
              let bestSavings = 0;
              let bestDiscountedPrice = originalPrice;
              let bestDiscountAmount = 0;
              let bestDiscountType = 'fixed';
              let hasAnyDiscount = false;

              // A. Account-specific flat discount
              if (userFlatDiscountPercent > 0) {
                bestSavings = (originalPrice * userFlatDiscountPercent) / 100;
                bestDiscountedPrice = originalPrice - bestSavings;
                bestDiscountAmount = userFlatDiscountPercent;
                bestDiscountType = 'percentage';
                hasAnyDiscount = true;
              }

              // B. Global flat discounts
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
                  hasAnyDiscount = true;
                }
              });

              if (hasAnyDiscount) {
                variation.flatDiscountPrice = Math.round(bestDiscountedPrice);
                variation.hasFlatDiscount = true;
                variation.flatDiscountAmount = bestDiscountAmount;
                variation.flatDiscountType = bestDiscountType;
              }
            }

            if (!showDealerPrice) {
              delete variation.dealerPrice;
            }
            if (!showRetailerPrice) {
              delete variation.retailerPrice;
            }
            if (!showCorporatePrice) {
              delete variation.corporatePrice;
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
