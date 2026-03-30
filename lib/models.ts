import mongoose, { Schema, Document } from "mongoose";

// --- USER MODEL ---
export interface IUser extends Document {
  email: string;
  mobile: string;
  password?: string;
  name: string;
  role: "customer" | "admin" | "moderator" | "super_admin";
  status: "active" | "disabled";
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    mobile: { type: String, required: true },
    password: { type: String }, // optional for oauth, required for credentials
    name: { type: String, required: true },
    role: { type: String, enum: ["customer", "admin", "moderator", "super_admin"], default: "customer" },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

export const User = mongoose.models?.User || mongoose.model<IUser>("User", UserSchema, "users");
export const Customer = mongoose.models?.Customer || mongoose.model<IUser>("Customer", UserSchema, "customers");
export const Admin = mongoose.models?.Admin || mongoose.model<IUser>("Admin", UserSchema, "admins");

// --- CART MODEL ---
export interface ICartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  image?: string;
  productSlug?: string;
  weight?: string;
  flavor?: string;
}

export interface ICart extends Document {
  userId: string;
  items: ICartItem[];
  promoCode?: string;
  discountAmount?: number;
}

const CartItemSchema = new Schema<ICartItem>({
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 1 },
  image: { type: String },
  productSlug: { type: String },
  weight: { type: String },
  flavor: { type: String },
});

const CartSchema = new Schema<ICart>(
  {
    userId: { type: String, required: true, unique: true },
    items: [CartItemSchema],
    promoCode: { type: String },
    discountAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Cart = mongoose.models?.Cart || mongoose.model<ICart>("Cart", CartSchema);


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
export interface IVariation {
  weight?: string;
  flavor?: string;
  price: number;
  discountPrice?: number;
  stock: number;
  isDefault?: boolean;
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  category: string; // Slug reference
  description?: string;
  variations: IVariation[];
  image: string; // Main image
  images: string[]; // Additional images
  ordersCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const VariationSchema = new Schema<IVariation>({
  weight: { type: String },
  flavor: { type: String },
  price: { type: Number, required: true },
  discountPrice: { type: Number },
  stock: { type: Number, required: true, default: 0 },
  isDefault: { type: Boolean, default: false },
});

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    category: { type: String, required: true },
    description: { type: String },
    variations: { type: [VariationSchema], default: [] },
    image: { type: String, required: true },
    images: [{ type: String }],
    ordersCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes for faster loading
ProductSchema.index({ category: 1 });
ProductSchema.index({ name: "text", description: "text" }); // For search prioritization

export const Product = mongoose.models?.Product || mongoose.model<IProduct>("Product", ProductSchema, "products");


// --- ORDER MODEL ---
export interface IOrderItem {
  productId?: string;
  productSlug?: string;
  name: string;
  quantity: number;
  price: number;
  weight?: string;
  flavor?: string;
  image?: string;
}

export interface IOrderLog {
  fromStatus: string;
  toStatus: string;
  changedBy: string; // Admin ID or Name
  changedAt: Date;
}

export interface IOrder extends Document {
  userId?: string;
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
  promoCode?: string;
  discountAmount?: number;
  status: string; // 'pending', 'cancelled', 'processing', 'shipped', 'delivered'
  cancelReason?: string;
  orderLogs?: IOrderLog[];
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  productId: { type: String },
  productSlug: { type: String },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  weight: { type: String },
  flavor: { type: String },
  image: { type: String },
});

const OrderLogSchema = new Schema<IOrderLog>({
  fromStatus: { type: String, required: true },
  toStatus: { type: String, required: true },
  changedBy: { type: String, required: true },
  changedAt: { type: Date, default: Date.now },
});

const OrderSchema = new Schema<IOrder>(
  {
    userId: { type: String },
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
    promoCode: { type: String },
    discountAmount: { type: Number, default: 0 },
    status: { type: String, default: "pending" },
    cancelReason: { type: String },
    orderLogs: [OrderLogSchema],
  },
  { timestamps: true }
);

// Indexes for administrative lookups and history
OrderSchema.index({ customerEmail: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ userId: 1 });
OrderSchema.index({ createdAt: -1 });

export const Order = mongoose.models?.Order || mongoose.model<IOrder>("Order", OrderSchema);
 
// --- ADMIN ACTIVITY MODEL ---
export interface IAdminActivity extends Document {
  adminEmail: string;
  action: string; // 'create_product', 'update_order', etc.
  targetId?: string;
  targetName?: string;
  details?: string;
  createdAt: Date;
  updatedAt: Date;
}
 
const AdminActivitySchema = new Schema<IAdminActivity>(
  {
    adminEmail: { type: String, required: true },
    action: { type: String, required: true },
    targetId: { type: String },
    targetName: { type: String },
    details: { type: String },
  },
  { timestamps: true }
);

// Indexes for audit trail performance
AdminActivitySchema.index({ adminEmail: 1 });
AdminActivitySchema.index({ action: 1 });
AdminActivitySchema.index({ createdAt: -1 });
 
export const AdminActivity = mongoose.models?.AdminActivity || mongoose.model<IAdminActivity>("AdminActivity", AdminActivitySchema, "admin_activities");
