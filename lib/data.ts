import connectDB from "./db";
import { Product, Category } from "./models";
import { unstable_cache } from "next/cache";

export interface GetProductsOptions {
  query?: any;
  sort?: any;
  limit?: number;
}

export const getProducts = unstable_cache(
  async (options: GetProductsOptions = {}) => {
    await connectDB();
    const { query = {}, sort = { createdAt: -1 }, limit = 0 } = options;
    
    // We only project the fields we need to reduce payload
    let databaseQuery = Product.find(query, { description: 0 }).sort(sort);
    
    if (limit > 0) {
      databaseQuery = databaseQuery.limit(limit);
    }
    
    const results = await databaseQuery.lean();
    return JSON.parse(JSON.stringify(results));
  },
  ["products-list"],
  { revalidate: 300, tags: ["products"] }
);

export const getProductBySlug = unstable_cache(
  async (slug: string) => {
    await connectDB();
    const result = await Product.findOne({ slug }).lean();
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
  ["product-by-slug"],
  { revalidate: 3600, tags: ["products"] }
);

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
