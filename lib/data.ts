import connectDB from "./db";
import { Product, Category } from "./models";

export interface GetProductsOptions {
  query?: any;
  sort?: any;
  limit?: number;
}

export async function getProducts(options: GetProductsOptions = {}) {
  await connectDB();
  const { query = {}, sort = { createdAt: -1 }, limit = 0 } = options;
  
  let databaseQuery = Product.find(query, { images: 0 }).sort(sort);
  
  if (limit > 0) {
    databaseQuery = databaseQuery.limit(limit);
  }
  
  return await databaseQuery.lean();
}

export async function getProductBySlug(slug: string) {
  await connectDB();
  return await Product.findOne({ slug }).lean();
}

export async function getCategoryBySlug(slug: string) {
  await connectDB();
  return await Category.findOne({ slug }).lean();
}

export async function getCategories() {
  await connectDB();
  return await Category.find({}).sort({ name: 1 }).lean();
}
