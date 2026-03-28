import crypto from "crypto";
import fs from "fs";
import path from "path";
import { FileStorage } from "@/lib/file-storage";
import { generateSlug } from "@/lib/api-helpers";

export interface UserRecord {
  id: string;
  email: string;
  password: string;
  name: string;
  role: "customer" | "admin" | "moderator" | "super_admin";
  status?: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductRecord {
  id: string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  price: number;
  image?: string;
  images?: string[];
  rating?: number;
  reviews?: number;
  stock?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type ProductUpsertInput = Omit<ProductRecord, "id" | "slug"> & {
  id?: string;
  slug?: string;
};

export interface OrderItem {
  productId?: string;
  productSlug?: string;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderRecord {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  postalCode: string;
  paymentMethod: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const PRODUCTS_DIR = path.join(DATA_DIR, "products");

function safeNow(): string {
  return new Date().toISOString();
}

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function readUsers(): UserRecord[] {
  return FileStorage.read<UserRecord[]>("users.json") || [];
}

export function writeUsers(users: UserRecord[]): boolean {
  return FileStorage.write("users.json", users);
}

export function readCategories(): CategoryRecord[] {
  return FileStorage.read<CategoryRecord[]>("categories.json") || [];
}

export function writeCategories(categories: CategoryRecord[]): boolean {
  return FileStorage.write("categories.json", categories);
}

export function readOrders(): OrderRecord[] {
  return FileStorage.read<OrderRecord[]>("orders.json") || [];
}

export function writeOrders(orders: OrderRecord[]): boolean {
  return FileStorage.write("orders.json", orders);
}

function listProductFilesRecursively(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listProductFilesRecursively(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(fullPath);
    }
  }

  return files;
}

function toStorageRelative(fullPath: string): string {
  return path.relative(DATA_DIR, fullPath).replace(/\\/g, "/");
}

export function readProducts(): ProductRecord[] {
  const files = listProductFilesRecursively(PRODUCTS_DIR);
  const products: ProductRecord[] = [];

  for (const file of files) {
    const relativePath = toStorageRelative(file);
    const data = FileStorage.read<ProductRecord>(relativePath);
    if (data) products.push(data);
  }

  return products;
}

export function readProductBySlug(
  slug: string,
): { product: ProductRecord; filePath: string } | null {
  const files = listProductFilesRecursively(PRODUCTS_DIR);

  for (const file of files) {
    if (!file.endsWith(`${slug}.json`)) continue;
    const relativePath = toStorageRelative(file);
    const product = FileStorage.read<ProductRecord>(relativePath);
    if (product) {
      return { product, filePath: relativePath };
    }
  }

  return null;
}

export function upsertProduct(input: ProductUpsertInput): ProductRecord {
  const now = safeNow();
  const slug = generateSlug(input.slug || input.name);
  const categorySlug = generateSlug(input.category);

  const existing = readProductBySlug(slug);
  const product: ProductRecord = {
    ...existing?.product,
    ...input,
    id: existing?.product.id || input.id || `prod-${Date.now()}`,
    slug,
    category: categorySlug,
    image:
      input.image ||
      existing?.product.image ||
      "/images/products/placeholder.jpg",
    rating: input.rating ?? existing?.product.rating ?? 0,
    stock: input.stock ?? existing?.product.stock ?? 0,
    createdAt: existing?.product.createdAt || now,
    updatedAt: now,
  };

  const filePath = `products/${categorySlug}/${slug}.json`;
  FileStorage.write(filePath, product);

  if (existing && existing.filePath !== filePath) {
    FileStorage.delete(existing.filePath);
  }

  refreshProductIndex();
  return product;
}

export function deleteProductBySlug(slug: string): boolean {
  const found = readProductBySlug(slug);
  if (!found) return false;

  const deleted = FileStorage.delete(found.filePath);
  if (deleted) {
    refreshProductIndex();
  }

  return deleted;
}

export function refreshProductIndex(): void {
  const products = readProducts();
  const payload = {
    lastUpdated: safeNow(),
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      price: p.price,
      image: p.image,
      rating: p.rating ?? 0,
      stock: p.stock ?? 0,
    })),
  };

  FileStorage.write("product-index.json", payload);
}

export function createCategory(
  input: Pick<CategoryRecord, "name" | "description" | "image">,
): CategoryRecord {
  const now = safeNow();
  return {
    id: `cat-${Date.now()}`,
    name: input.name,
    slug: generateSlug(input.name),
    description: input.description || "",
    image: input.image || "",
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeRole(role: string): "admin" | "moderator" {
  return role === "moderator" ? "moderator" : "admin";
}
