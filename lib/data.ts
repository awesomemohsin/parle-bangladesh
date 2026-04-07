import connectDB from "./db";
import { Product, Category } from "./models";
import { unstable_cache } from "next/cache";

export interface GetProductsOptions {
  query?: any;
  sort?: any;
  limit?: number;
}

// Optimized fetching with projection and lean
async function fetchProductsRaw(options: GetProductsOptions = {}) {
    await connectDB();
    const { query = {}, sort = { createdAt: -1 }, limit = 0 } = options;
    
    // Explicitly select only necessary fields for shop cards
    let databaseQuery = Product.find(query, { 
      description: 0, 
      "variations.stockHistory": 0 
    }).sort(sort);
    
    if (limit > 0) {
      databaseQuery = databaseQuery.limit(limit);
    }
    
    const results = await databaseQuery.lean();
    return JSON.parse(JSON.stringify(results));
}

export async function getProducts(options: GetProductsOptions = {}) {
    // Only cache simple homepage/shop queries to avoid cache key collision issues with complex objects
    if (!options.query && options.limit) {
       return unstable_cache(
         () => fetchProductsRaw(options),
         [`products-list-limit-${options.limit}-${JSON.stringify(options.sort)}`],
         { revalidate: 300, tags: ["products"] }
       )();
    }
    return fetchProductsRaw(options);
}

export async function getProductBySlug(slug: string) {
    await connectDB();
    const result = await Product.findOne({ slug }).lean();
    return result ? JSON.parse(JSON.stringify(result)) : null;
}

export async function getCategoryBySlug(slug: string) {
  await connectDB();
  return await Category.findOne({ slug }).lean();
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
