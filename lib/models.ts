import mongoose, { Schema, Document } from "mongoose";

// --- USER MODEL ---
export interface IUser extends Document {
  email: string;
  password?: string;
  name: string;
  role: "customer" | "admin" | "moderator" | "super_admin";
  status: "active" | "disabled";
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String }, // optional for oauth, required for credentials
    name: { type: String, required: true },
    role: { type: String, enum: ["customer", "admin", "moderator", "super_admin"], default: "customer" },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
  },
  { timestamps: true }
);

export const User = mongoose.models?.User || mongoose.model<IUser>("User", UserSchema);


// --- CATEGORY MODEL ---
export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String },
    image: { type: String },
  },
  { timestamps: true }
);

export const Category = mongoose.models?.Category || mongoose.model<ICategory>("Category", CategorySchema);


// --- PRODUCT MODEL ---
export interface IProduct extends Document {
  name: string;
  slug: string;
  category: string; // Sticking with slug reference based on original logic
  description?: string;
  price: number;
  image?: string;
  images?: string[];
  rating?: number;
  reviews?: number;
  stock?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    category: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    image: { type: String },
    images: [{ type: String }],
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Product = mongoose.models?.Product || mongoose.model<IProduct>("Product", ProductSchema);


// --- ORDER MODEL ---
export interface IOrderItem {
  productId?: string;
  productSlug?: string;
  name: string;
  quantity: number;
  price: number;
}

export interface IOrder extends Document {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  postalCode: string;
  paymentMethod: string;
  items: IOrderItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  status: string; // 'pending', 'processing', 'completed', 'cancelled'
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  productId: { type: String },
  productSlug: { type: String },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
});

const OrderSchema = new Schema<IOrder>(
  {
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    paymentMethod: { type: String, required: true },
    items: [OrderItemSchema],
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
    status: { type: String, default: "pending" },
  },
  { timestamps: true }
);

export const Order = mongoose.models?.Order || mongoose.model<IOrder>("Order", OrderSchema);
