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
}, { timestamps: true, collection: "users" });

const Category = mongoose.models.Category || mongoose.model("Category", CategorySchema);
const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);
const User = mongoose.models.User || mongoose.model("User", UserSchema);

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
    price: 35, 
    weight: "200g",
    flavor: "Original",
    variations: [
      { weight: "400g", flavor: "Original", price: 65, stock: 50 },
      { weight: "800g", flavor: "Original", price: 120, stock: 30 }
    ],
    image: "/images/products/parle-g-gold.jpg", 
    images: ["/images/products/parle-g-gold.jpg"], 
    rating: 4.5, 
    reviews: 128, 
    stock: 100 
  },
  { 
    name: "Parle Gluco Biscuits", 
    slug: "parle-gluco", 
    category: "biscuits", 
    description: "Glucose biscuits with nutritious goodness", 
    price: 45, 
    weight: "250g",
    flavor: "Glucose",
    variations: [
      { weight: "500g", flavor: "Glucose", price: 85, stock: 40 }
    ],
    image: "/images/products/parle-gluco.jpg", 
    images: ["/images/products/parle-gluco.jpg"], 
    rating: 4.3, 
    reviews: 95, 
    stock: 80 
  },
  { 
    name: "Hide & Seek Choco", 
    slug: "hide-seek-choco", 
    category: "biscuits", 
    description: "Delightful chocolate chip biscuits", 
    price: 55, 
    weight: "100g",
    flavor: "Chocolate",
    variations: [
      { weight: "200g", flavor: "Chocolate", price: 100, stock: 60 },
      { weight: "400g", flavor: "Chocolate", price: 190, stock: 20 }
    ],
    image: "/images/products/hide-seek-choco.jpg", 
    images: ["/images/products/hide-seek-choco.jpg"], 
    rating: 4.7, 
    reviews: 256, 
    stock: 120 
  },
  { 
    name: "Parle Wafers Cream & Onion", 
    slug: "parle-wafers-cream-onion", 
    category: "wafers", 
    description: "Crispy wafers with cream and onion flavor", 
    price: 40, 
    weight: "75g",
    flavor: "Cream & Onion",
    variations: [
      { weight: "150g", flavor: "Cream & Onion", price: 75, stock: 45 }
    ],
    image: "/images/products/wafers-cream-onion.jpg", 
    images: ["/images/products/wafers-cream-onion.jpg"], 
    rating: 4.4, 
    reviews: 142, 
    stock: 90 
  },
  { 
    name: "Parle Wafers Salt & Pepper", 
    slug: "parle-wafers-salt-pepper", 
    category: "wafers", 
    description: "Crispy wafers with salt and pepper seasoning", 
    price: 40, 
    weight: "75g",
    flavor: "Salt & Pepper",
    variations: [
      { weight: "150g", flavor: "Salt & Pepper", price: 75, stock: 40 }
    ],
    image: "/images/products/wafers-salt-pepper.jpg", 
    images: ["/images/products/wafers-salt-pepper.jpg"], 
    rating: 4.2, 
    reviews: 110, 
    stock: 75 
  },
  { 
    name: "Monaco Biscuits", 
    slug: "monaco-biscuits", 
    category: "snacks", 
    description: "Crunchy savory biscuits with unique taste", 
    price: 50, 
    weight: "150g",
    flavor: "Classic Salted",
    image: "/images/products/monaco.jpg", 
    images: ["/images/products/monaco.jpg"], 
    rating: 4.6, 
    reviews: 189, 
    stock: 110 
  },
  { 
    name: "Parle Magix Biscuits", 
    slug: "parle-magix", 
    category: "biscuits", 
    description: "Magic taste in every bite", 
    price: 65, 
    weight: "150g",
    flavor: "Mixed",
    variations: [
      { weight: "150g", flavor: "Orange", price: 65, stock: 30 },
      { weight: "150g", flavor: "Chocolate", price: 65, stock: 30 }
    ],
    image: "/images/products/magix.jpg", 
    images: ["/images/products/magix.jpg"], 
    rating: 4.5, 
    reviews: 167, 
    stock: 85 
  },
  { 
    name: "Parle Cashew Cookies", 
    slug: "parle-cashew-cookies", 
    category: "cookies", 
    description: "Premium cookies with cashew pieces", 
    price: 80, 
    weight: "100g",
    flavor: "Cashew",
    variations: [
      { weight: "200g", flavor: "Cashew", price: 150, stock: 30 }
    ],
    image: "/images/products/cashew-cookies.jpg", 
    images: ["/images/products/cashew-cookies.jpg"], 
    rating: 4.8, 
    reviews: 203, 
    stock: 60 
  },
];

const users = [
  { email: "superadmin@parle.com", mobile: "01700000000", password: hashPassword("superadmin123"), name: "Super Admin", role: "super_admin", status: "active" },
  { email: "admin@parle.com", mobile: "01711111111", password: hashPassword("admin123"), name: "Admin User", role: "admin", status: "active" },
  { email: "moderator@parle.com", mobile: "01722222222", password: hashPassword("moderator123"), name: "Moderator", role: "moderator", status: "active" },
];

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully.\n");

    console.log("Clearing existing data...");
    await Category.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});
    
    console.log("Seeding categories...");
    await Category.insertMany(categories);
    
    console.log("Seeding products...");
    await Product.insertMany(products);
    
    console.log("Seeding users...");
    await User.insertMany(users);
    
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
