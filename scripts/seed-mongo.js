const mongoose = require("mongoose");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Read MONGODB_URI from .env.local if not using --env-file
let MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const envFile = fs.readFileSync(envPath, "utf8");
    const match = envFile.match(/MONGODB_URI=(.*)/);
    if (match) MONGODB_URI = match[1].replace(/['"]/g, "");
  } catch (e) {}
}

if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in .env.local!");
  process.exit(1);
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String },
  image: { type: String },
}, { timestamps: true });

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  category: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  weight: { type: String },
  flavor: { type: String },
  variations: [new mongoose.Schema({
    weight: { type: String },
    flavor: { type: String },
    price: { type: Number, required: true },
    stock: { type: Number },
  })],
  image: { type: String },
  images: [{ type: String }],
  rating: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  mobile: { type: String, required: true },
  password: { type: String },
  name: { type: String, required: true },
  role: { type: String, default: "customer" },
  status: { type: String, default: "active" },
}, { timestamps: true });

const Category = mongoose.models.Category || mongoose.model("Category", CategorySchema, "categories");
const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema, "products");
const Admin = mongoose.models.Admin || mongoose.model("Admin", UserSchema, "admins");
const User = mongoose.models.User || mongoose.model("User", UserSchema, "users");

const categories = [
  { name: "Biscuits", slug: "biscuits", description: "Delicious biscuits for every occasion", image: "/images/category-biscuits.jpg" },
  { name: "Wafers", slug: "wafers", description: "Crispy wafers with amazing flavors", image: "/images/category-wafers.jpg" },
  { name: "Snacks", slug: "snacks", description: "Healthy and tasty snack options", image: "/images/category-snacks.jpg" },
  { name: "Cookies", slug: "cookies", description: "Sweet cookies for everyone", image: "/images/category-cookies.jpg" },
];

const products = [
  { 
    name: "Parle-G Gold Biscuits", 
    slug: "parle-g-gold", 
    category: "biscuits", 
    description: "Golden, crispy biscuits with a perfect taste", 
    variations: [
      { weight: "200g", flavor: "Original", price: 35, stock: 100, isDefault: true },
      { weight: "400g", flavor: "Original", price: 65, stock: 50 },
      { weight: "800g", flavor: "Original", price: 120, stock: 30 }
    ],
    image: "/images/biscuits/parle-g-gold/1.webp", 
    images: ["/images/biscuits/parle-g-gold/1.webp", "/images/biscuits/parle-g-gold/2.webp"], 
  },
  { 
    name: "Parle Gluco Biscuits", 
    slug: "parle-gluco", 
    category: "biscuits", 
    description: "Glucose biscuits with nutritious goodness", 
    variations: [
      { weight: "250g", flavor: "Glucose", price: 45, stock: 80, isDefault: true },
      { weight: "500g", flavor: "Glucose", price: 85, stock: 40 }
    ],
    image: "/images/biscuits/parle-gluco/1.webp", 
    images: ["/images/biscuits/parle-gluco/1.webp"], 
  },
  { 
    name: "Hide & Seek Choco", 
    slug: "hide-seek-choco", 
    category: "biscuits", 
    description: "Delightful chocolate chip biscuits", 
    variations: [
      { weight: "100g", flavor: "Chocolate", price: 55, stock: 120, isDefault: true },
      { weight: "200g", flavor: "Chocolate", price: 100, stock: 60 },
      { weight: "400g", flavor: "Chocolate", price: 190, stock: 20 }
    ],
    image: "/images/biscuits/hide-seek-choco/1.webp", 
    images: ["/images/biscuits/hide-seek-choco/1.webp"], 
  },
  { 
    name: "Parle Wafers Cream & Onion", 
    slug: "parle-wafers-cream-onion", 
    category: "wafers", 
    description: "Crispy wafers with cream and onion flavor", 
    variations: [
      { weight: "75g", flavor: "Cream & Onion", price: 40, stock: 90, isDefault: true },
      { weight: "150g", flavor: "Cream & Onion", price: 75, stock: 45 }
    ],
    image: "/images/wafers/parle-wafers-cream-onion/1.webp", 
    images: ["/images/wafers/parle-wafers-cream-onion/1.webp"], 
  },
  { 
    name: "Parle Wafers Salt & Pepper", 
    slug: "parle-wafers-salt-pepper", 
    category: "wafers", 
    description: "Crispy wafers with salt and pepper seasoning", 
    variations: [
      { weight: "75g", flavor: "Salt & Pepper", price: 40, stock: 75, isDefault: true },
      { weight: "150g", flavor: "Salt & Pepper", price: 75, stock: 40 }
    ],
    image: "/images/wafers/parle-wafers-salt-pepper/1.webp", 
    images: ["/images/wafers/parle-wafers-salt-pepper/1.webp"], 
  },
  { 
    name: "Monaco Biscuits", 
    slug: "monaco-biscuits", 
    category: "snacks", 
    description: "Crunchy savory biscuits with unique taste", 
    variations: [
      { weight: "150g", flavor: "Classic Salted", price: 50, stock: 110, isDefault: true }
    ],
    image: "/images/snacks/monaco-biscuits/1.webp", 
    images: ["/images/snacks/monaco-biscuits/1.webp"], 
  },
  { 
    name: "Parle Magix Biscuits", 
    slug: "parle-magix", 
    category: "biscuits", 
    description: "Magic taste in every bite", 
    variations: [
      { weight: "150g", flavor: "Orange", price: 65, stock: 30, isDefault: true },
      { weight: "150g", flavor: "Chocolate", price: 65, stock: 30 }
    ],
    image: "/images/biscuits/parle-magix/1.webp", 
    images: ["/images/biscuits/parle-magix/1.webp"], 
  },
  { 
    name: "Parle Cashew Cookies", 
    slug: "parle-cashew-cookies", 
    category: "cookies", 
    description: "Premium cookies with cashew pieces", 
    variations: [
      { weight: "100g", flavor: "Cashew", price: 80, stock: 60, isDefault: true },
      { weight: "200g", flavor: "Cashew", price: 150, stock: 30 }
    ],
    image: "/images/cookies/parle-cashew-cookies/1.webp", 
    images: ["/images/cookies/parle-cashew-cookies/1.webp"], 
  },
];

const staff = [
  { email: "superadmin@parle.com", mobile: "01700000000", password: hashPassword("superadmin123"), name: "Super Admin", role: "super_admin", status: "active" },
  { email: "admin@parle.com", mobile: "01711111111", password: hashPassword("admin123"), name: "Admin User", role: "admin", status: "active" },
  { email: "moderator@parle.com", mobile: "01722222222", password: hashPassword("moderator123"), name: "Moderator", role: "moderator", status: "active" },
];

async function seed() {
  try {
    console.log("Connecting to MongoDB (parle database)...");
    await mongoose.connect(MONGODB_URI, { dbName: "parle" });
    console.log("Connected successfully.\n");

    console.log("Clearing existing data...");
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Admin.deleteMany({});
    await User.deleteMany({});
    
    console.log("Seeding categories...");
    await Category.insertMany(categories);
    
    console.log("Seeding products...");
    await Product.insertMany(products);
    
    console.log("Seeding admins...");
    await Admin.insertMany(staff);
    
    console.log("\n✅ MongoDB Database seeding completed successfully!");
    console.log("\n📝 Admin Credentials:");
    console.log("Super Admin: superadmin@parle.com / superadmin123");
    console.log("Admin: admin@parle.com / admin123");
    console.log("Moderator: moderator@parle.com / moderator123");

    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

seed();
