import mongoose, { Schema, Document } from "mongoose";

// --- USER MODEL ---
export interface IUser extends Document {
  email: string;
  mobile: string;
  password?: string;
  name: string;
  role: "customer" | "admin" | "moderator" | "super_admin" | "owner";
  customerType: "retailer" | "dealer";
  status: "active" | "disabled";
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  resetRequestCount?: number;
  lastResetRequest?: Date;
  otpCode?: string;
  otpExpires?: Date;
  failedLoginAttempts?: number;
  lockUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  tokenVersion: number;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    mobile: { type: String, required: true },
    password: { type: String }, // optional for oauth, required for credentials
    name: { type: String, required: true },
    role: { type: String, enum: ["customer", "admin", "moderator", "super_admin", "owner"], default: "customer" },
    customerType: { type: String, enum: ["retailer", "dealer"], default: "retailer" },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    resetRequestCount: { type: Number, default: 0 },
    lastResetRequest: { type: Date },
    otpCode: { type: String },
    otpExpires: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const User = mongoose.models?.User || mongoose.model<IUser>("User", UserSchema, "users");
export const Customer = mongoose.models?.Customer || mongoose.model<IUser>("Customer", UserSchema, "customers");
export const Admin = mongoose.models?.Admin || mongoose.model<IUser>("Admin", UserSchema, "admins");

// --- LOGIN HISTORY MODEL ---
export interface ILoginHistory extends Document {
  email: string;
  role: string;
  ipAddress: string;
  userAgent: string;
  deviceInfo?: string;
  status: "success" | "failed" | "otp_requested";
  createdAt: Date;
}

const LoginHistorySchema = new Schema<ILoginHistory>(
  {
    email: { type: String, required: true },
    role: { type: String, required: true },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, required: true },
    deviceInfo: { type: String },
    status: { type: String, enum: ["success", "failed", "otp_requested"], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const LoginHistory = mongoose.models?.LoginHistory || mongoose.model<ILoginHistory>("LoginHistory", LoginHistorySchema, "login_histories");


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
  promoDetails?: any;
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
    promoDetails: { type: Schema.Types.Mixed },
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


// --- BRAND MODEL ---
export interface IBrand extends Document {
  name: string;
  slug: string;
  category: string; // Slug reference to its parent category
  description?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BrandSchema = new Schema<IBrand>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    category: { type: String, default: 'biscuits' },
    description: { type: String },
    image: { type: String },
  },
  { timestamps: true }
);

export const Brand = mongoose.models?.Brand || mongoose.model<IBrand>("Brand", BrandSchema);


// --- PRODUCT MODEL ---
export interface IVariation {
  weight?: string;
  flavor?: string;
  price: number;
  dealerPrice?: number;
  discountPrice?: number;
  stock: number;
  holdStock: number;
  deliveredCount: number;
  lostCount: number;
  damagedCount: number;
  stockHistory?: {
    amount: number;
    date: Date;
    reason?: string;
  }[];
  image?: string; // Image specific to this variation
  description?: string; // Dynamic description for this variation
  isDefault?: boolean;
  isBulk?: boolean;
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  category: string; // Slug reference
  description?: string;
  variations: IVariation[];
  ordersCount: number;
  brand?: string;
  isBulk?: boolean;
  price?: number; // legacy fallback
  stock?: number; // legacy fallback
  createdAt: Date;
  updatedAt: Date;
}

const VariationSchema = new Schema<IVariation>({
  weight: { type: String },
  flavor: { type: String },
  price: { type: Number, required: true },
  dealerPrice: { type: Number },
  discountPrice: { type: Number },
  stock: { type: Number, required: true, default: 0 },
  holdStock: { type: Number, default: 0 },
  deliveredCount: { type: Number, default: 0 },
  lostCount: { type: Number, default: 0 },
  damagedCount: { type: Number, default: 0 },
  stockHistory: [{
    amount: { type: Number },
    date: { type: Date, default: Date.now },
    reason: { type: String }
  }],
  image: { type: String },
  description: { type: String },
  isDefault: { type: Boolean, default: false },
  isBulk: { type: Boolean, default: false },
});

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    category: { type: String, required: true },
    description: { type: String },
    variations: { type: [VariationSchema], default: [] },
    ordersCount: { type: Number, default: 0 },
    brand: { type: String },
    isBulk: { type: Boolean, default: false },
    price: { type: Number },
    stock: { type: Number },
  },
  { timestamps: true }
);

ProductSchema.index({ category: 1 });
ProductSchema.index({ name: "text", description: "text" }); 

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
  reason?: string;
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
  ruleDiscount?: number;
  promoDiscount?: number;
  isRestricted?: boolean;
  status: string; // 'pending', 'cancelled', 'processing', 'shipped', 'delivered'
  cancelReason?: string;
  statusReason?: string;
  instruction?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingPostalCode?: string;
  deliveryMethod?: string;
  orderLogs?: IOrderLog[];
  customerType?: string; // 'retailer', 'dealer'
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
  reason: { type: String },
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
    items: { type: [OrderItemSchema], default: [] },
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    promoCode: { type: String },
    discountAmount: { type: Number, default: 0 },
    ruleDiscount: { type: Number, default: 0 },
    promoDiscount: { type: Number, default: 0 },
    isRestricted: { type: Boolean, default: false },
    status: { type: String, required: true, default: "pending" },
    cancelReason: { type: String },
    statusReason: { type: String },
    instruction: { type: String },
    shippingAddress: { type: String },
    shippingCity: { type: String },
    shippingPostalCode: { type: String },
    deliveryMethod: { type: String, default: "shipping" },
    orderLogs: { type: [OrderLogSchema], default: [] },
    customerType: { type: String, default: "retailer" },
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
 
// --- APPROVAL REQUEST MODEL ---
export interface IApprovalRequest extends Document {
  requesterEmail: string;
  type: "product" | "order" | "promo-code";
  targetId: string;
  targetName: string;
  targetSlug?: string;
  field: string;
  oldValue: string;
  newValue: string;
  weight?: string;
  flavor?: string;
  variationIndex?: number; // for product variations
  status: "pending" | "approved" | "declined";
  
  // High-Fidelity Context: Store the full object (Order or Product variation) for review
  targetDetails?: any;

  // Multi-tier approval
  stage: "superadmin" | "owner";
  superadminApprovals: string[]; // ['Anindo', 'Saiful']
  ownerApproved: boolean;
  declinedBy?: string; // name or email of the person who declined
  comments?: { user: string; text: string; date: Date }[];
  
  createdAt: Date;
  updatedAt: Date;
}

const ApprovalRequestSchema = new Schema<IApprovalRequest>(
  {
    requesterEmail: { type: String, required: true },
    type: { type: String, enum: ["product", "order", "promo-code"], required: true },
    targetId: { type: String, required: true },
    targetName: { type: String, required: true },
    targetSlug: { type: String }, // For products
    field: { type: String, required: true },
    oldValue: { type: String, required: true },
    newValue: { type: String, required: true },
    weight: { type: String },
    flavor: { type: String },
    variationIndex: { type: Number },
    status: { type: String, enum: ["pending", "approved", "declined"], default: "pending" },
    
    // Store full snapshot for review
    targetDetails: { type: Schema.Types.Mixed },

    stage: { type: String, enum: ["superadmin", "owner"], default: "superadmin" },
    superadminApprovals: { type: [String], default: [] },
    ownerApproved: { type: Boolean, default: false },
    declinedBy: { type: String },
    comments: [{ user: String, text: String, date: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);

ApprovalRequestSchema.index({ status: 1 });
ApprovalRequestSchema.index({ type: 1 });
ApprovalRequestSchema.index({ stage: 1 });
ApprovalRequestSchema.index({ targetId: 1 });
ApprovalRequestSchema.index({ requesterEmail: 1 });
ApprovalRequestSchema.index({ createdAt: -1 });

export const ApprovalRequest = mongoose.models?.ApprovalRequest || mongoose.model<IApprovalRequest>("ApprovalRequest", ApprovalRequestSchema, "approval_requests");

// --- NOTIFICATION MODEL ---
export interface INotification extends Document {
  userId?: string; // Specific user target
  role?: string; // Target role (e.g., 'admin', 'super_admin')
  title: string;
  message: string;
  type: "order" | "approval" | "system" | "alert";
  targetLink?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: String },
    role: { type: String },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["order", "approval", "system", "alert"], required: true },
    targetLink: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ role: 1 });
NotificationSchema.index({ userId: 1 });
NotificationSchema.index({ isRead: 1 });
NotificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.models?.Notification || mongoose.model<INotification>("Notification", NotificationSchema, "notifications");

// --- PROMO CODE MODEL ---
export interface IPromoCode extends Document {
  code?: string;
  type: 'promo' | 'flat';
  discountType: 'fixed' | 'percentage';
  discountAmount: number;
  maxUsage: number;
  currentUsage: number;
  isActive: boolean;
  status: 'pending' | 'approved' | 'declined';
  allProducts: boolean;
  applicableProducts: string[]; // Array of product IDs
  minOrderAmount: number;
  maxDiscountAmount?: number;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PromoCodeSchema = new Schema<IPromoCode>(
  {
    code: { type: String, unique: true, uppercase: true, sparse: true },
    type: { type: String, enum: ['promo', 'flat'], default: 'promo' },
    discountType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
    discountAmount: { type: Number, required: true },
    maxUsage: { type: Number, required: true, default: 50 },
    currentUsage: { type: Number, default: 0 },
    isActive: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'approved', 'declined'], default: 'pending' },
    allProducts: { type: Boolean, default: true },
    applicableProducts: [{ type: String }],
    minOrderAmount: { type: Number, default: 0 },
    maxDiscountAmount: { type: Number, default: 0 },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

PromoCodeSchema.index({ isActive: 1 });
PromoCodeSchema.index({ status: 1 });
PromoCodeSchema.index({ expiresAt: 1 });
PromoCodeSchema.index({ type: 1 });

export const PromoCode = mongoose.models?.PromoCode || mongoose.model<IPromoCode>("PromoCode", PromoCodeSchema, "promo_codes"); 

// --- CONTACT SUBMISSION MODEL ---
export interface IContactSubmission extends Document {
  name: string;
  number: string;
  email?: string;
  message?: string;
  type: "regular" | "corporate" | "dealer";
  organizationName?: string; // only for corporate
  location?: string; // especially for dealers
  isSeen: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSubmissionSchema = new Schema<IContactSubmission>(
  {
    name: { type: String, required: true },
    number: { type: String, required: true },
    email: { type: String },
    message: { type: String },
    type: { type: String, enum: ["regular", "corporate", "dealer"], default: "regular" },
    organizationName: { type: String },
    location: { type: String },
    isSeen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ContactSubmissionSchema.index({ type: 1 });
ContactSubmissionSchema.index({ createdAt: -1 });

export const ContactSubmission = mongoose.models?.ContactSubmission || mongoose.model<IContactSubmission>("ContactSubmission", ContactSubmissionSchema, "contact_submissions");

// --- JOB CIRCULAR MODEL ---
export interface IJobCircular extends Document {
  title: string;
  description: string;
  requirements: string[];
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Internship";
  salaryRange?: string;
  benefits?: string[];
  deadline: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const JobCircularSchema = new Schema<IJobCircular>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    requirements: [{ type: String }],
    benefits: [{ type: String }],
    location: { type: String, required: true },
    type: { type: String, enum: ["Full-time", "Part-time", "Contract", "Internship"], default: "Full-time" },
    salaryRange: { type: String },
    deadline: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const JobCircular = mongoose.models?.JobCircular || mongoose.model<IJobCircular>("JobCircular", JobCircularSchema, "job_circulars");

// --- CAREER APPLICATION MODEL ---
export interface ICareerApplication extends Document {
  fullname: string;
  email: string;
  phone: string;
  position: string;
  experience?: string;
  resumeUrl?: string;
  message?: string;
  status: "pending" | "reviewed" | "shortlisted" | "rejected";
  isSeen?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CareerApplicationSchema = new Schema<ICareerApplication>(
  {
    fullname: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    position: { type: String, required: true },
    experience: { type: String },
    resumeUrl: { type: String },
    message: { type: String },
    status: { type: String, enum: ["pending", "reviewed", "shortlisted", "rejected"], default: "pending" },
    isSeen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CareerApplicationSchema.index({ position: 1 });
CareerApplicationSchema.index({ createdAt: -1 });

export const CareerApplication = mongoose.models?.CareerApplication || mongoose.model<ICareerApplication>("CareerApplication", CareerApplicationSchema, "career_applications");

// --- PROMO POSTER MODEL ---
export interface IPromoPoster extends Document {
  imageUrl: string;
  link: string;
  altText: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const PromoPosterSchema = new Schema<IPromoPoster>(
  {
    imageUrl: { type: String, required: true },
    link: { type: String, default: "/shop" },
    altText: { type: String, default: "Special Promotion" },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PromoPosterSchema.index({ isActive: 1 });
PromoPosterSchema.index({ order: 1 });

export const PromoPoster = mongoose.models?.PromoPoster || mongoose.model<IPromoPoster>("PromoPoster", PromoPosterSchema, "promo_posters");

