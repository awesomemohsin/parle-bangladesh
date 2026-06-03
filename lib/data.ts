import connectDB from "./db";
import { Product, Category, PromoCode } from "./models";
import { unstable_cache } from "next/cache";

export interface GetProductsOptions {
  query?: any;
  sort?: any;
  limit?: number;
}

// Helper to apply flat discounts to a list of products
async function applyFlatDiscounts(products: any[]) {
  if (!products || products.length === 0) return products;
  
  const flatDiscounts = await PromoCode.find({ type: 'flat', isActive: true }).lean();
  if (flatDiscounts.length === 0) return products;

  return products.map(product => {
    if (product.variations) {
      const productIdStr = product._id?.toString();
      
      product.variations = product.variations.map((v: any) => {
        const variation = { ...v };
        
        // Find applicable flat discounts
        // Check both allProducts flag AND if the product ID is in the applicable list
        const applicableFlat = flatDiscounts.find(d => 
          d.allProducts || (d.applicableProducts && d.applicableProducts.some((id: any) => id.toString() === productIdStr))
        );

        if (applicableFlat) {
          const amount = Number(applicableFlat.discountAmount || 0);
          const originalPrice = Number(variation.price);
          let discounted = originalPrice;
          
          if (applicableFlat.discountType === 'percentage') {
            discounted = originalPrice - (originalPrice * amount) / 100;
          } else {
            discounted = Math.max(0, originalPrice - amount);
          }

          variation.flatDiscountPrice = Math.round(discounted);
          variation.hasFlatDiscount = true;
          variation.flatDiscountAmount = amount;
          variation.flatDiscountType = applicableFlat.discountType;
        }
        return variation;
      });
    }
    return product;
  });
}

// Optimized fetching with projection and lean
async function fetchProductsRaw(options: GetProductsOptions = {}) {
    await connectDB();
    const { query = {}, sort = { serial: 1, createdAt: -1 }, limit = 0 } = options;
    
    // Explicitly select only necessary fields for shop cards
    let databaseQuery = Product.find(query, { 
      description: 0, 
      "variations.stockHistory": 0 
    }).sort(sort);
    
    if (limit > 0) {
      databaseQuery = databaseQuery.limit(limit);
    }
    
    const results = await databaseQuery.lean();
    const withDiscounts = await applyFlatDiscounts(results);
    return JSON.parse(JSON.stringify(withDiscounts));
}

export async function getProducts(options: GetProductsOptions = {}) {
    const isCacheable = !options.query;
    if (isCacheable) {
       const limit = options.limit || 0;
       const sortStr = JSON.stringify(options.sort || {});
       return unstable_cache(
         () => fetchProductsRaw(options),
         [`products-list-v3-${limit}-${sortStr}`],
         { revalidate: 60, tags: ["products"] }
       )();
    }
    return fetchProductsRaw(options);
}

export async function getProductBySlug(slug: string) {
    return unstable_cache(
      async () => {
        await connectDB();
        const result = await Product.findOne({ slug }).lean();
        if (!result) return null;
        
        const productsWithDiscounts = await applyFlatDiscounts([result]);
        return JSON.parse(JSON.stringify(productsWithDiscounts[0]));
      },
      [`product-by-slug-${slug}`],
      { revalidate: 60, tags: [`product-${slug}`, "products"] }
    )();
}

export async function getCategoryBySlug(slug: string) {
  return unstable_cache(
    async () => {
      await connectDB();
      return await Category.findOne({ slug }).lean();
    },
    [`category-by-slug-${slug}`],
    { revalidate: 3600, tags: [`category-${slug}`, "categories"] }
  )();
}

export const getCategories = unstable_cache(
  async () => {
    await connectDB();
    const results = await Category.find({}).sort({ name: 1 }).lean();
    return JSON.parse(JSON.stringify(results));
  },
  ["categories-list"],
  { revalidate: 3600, tags: ["categories"] }
);
