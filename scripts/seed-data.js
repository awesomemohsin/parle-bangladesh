const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Hash password function
function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Create data directory structure
const dataDir = path.join(process.cwd(), "data");
const categoriesDir = path.join(dataDir, "categories");
const productsDir = path.join(dataDir, "products");
const ordersDir = path.join(dataDir, "orders");
const usersDir = path.join(dataDir, "users");

// Ensure directories exist
[dataDir, categoriesDir, productsDir, ordersDir, usersDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Categories data
const categories = [
  {
    id: "cat-001",
    name: "Biscuits",
    slug: "biscuits",
    description: "Delicious biscuits for every occasion",
    image: "/images/category-biscuits.jpg",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cat-002",
    name: "Wafers",
    slug: "wafers",
    description: "Crispy wafers with amazing flavors",
    image: "/images/category-wafers.jpg",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cat-003",
    name: "Snacks",
    slug: "snacks",
    description: "Healthy and tasty snack options",
    image: "/images/category-snacks.jpg",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cat-004",
    name: "Cookies",
    slug: "cookies",
    description: "Sweet cookies for everyone",
    image: "/images/category-cookies.jpg",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Save categories
fs.writeFileSync(
  path.join(dataDir, "categories.json"),
  JSON.stringify(categories, null, 2),
);
console.log("Created categories.json");

// Products data - sample Parle products
const products = [
  {
    id: "prod-001",
    name: "Parle-G Gold Biscuits",
    slug: "parle-g-gold",
    category: "biscuits",
    description: "Golden, crispy biscuits with a perfect taste",
    price: 35,
    originalPrice: 40,
    image: "/images/products/parle-g-gold.jpg",
    images: ["/images/products/parle-g-gold.jpg"],
    rating: 4.5,
    reviews: 128,
    stock: 100,
    sku: "PG-001",
    weight: "200g",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-002",
    name: "Parle Gluco Biscuits",
    slug: "parle-gluco",
    category: "biscuits",
    description: "Glucose biscuits with nutritious goodness",
    price: 45,
    originalPrice: 50,
    image: "/images/products/parle-gluco.jpg",
    images: ["/images/products/parle-gluco.jpg"],
    rating: 4.3,
    reviews: 95,
    stock: 80,
    sku: "PG-002",
    weight: "250g",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-003",
    name: "Hide & Seek Choco",
    slug: "hide-seek-choco",
    category: "biscuits",
    description: "Delightful chocolate chip biscuits",
    price: 55,
    originalPrice: 60,
    image: "/images/products/hide-seek-choco.jpg",
    images: ["/images/products/hide-seek-choco.jpg"],
    rating: 4.7,
    reviews: 256,
    stock: 120,
    sku: "HSC-001",
    weight: "150g",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-004",
    name: "Parle Wafers Cream & Onion",
    slug: "parle-wafers-cream-onion",
    category: "wafers",
    description: "Crispy wafers with cream and onion flavor",
    price: 40,
    originalPrice: 45,
    image: "/images/products/wafers-cream-onion.jpg",
    images: ["/images/products/wafers-cream-onion.jpg"],
    rating: 4.4,
    reviews: 142,
    stock: 90,
    sku: "WCO-001",
    weight: "100g",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-005",
    name: "Parle Wafers Salt & Pepper",
    slug: "parle-wafers-salt-pepper",
    category: "wafers",
    description: "Crispy wafers with salt and pepper seasoning",
    price: 40,
    originalPrice: 45,
    image: "/images/products/wafers-salt-pepper.jpg",
    images: ["/images/products/wafers-salt-pepper.jpg"],
    rating: 4.2,
    reviews: 110,
    stock: 75,
    sku: "WSP-001",
    weight: "100g",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-006",
    name: "Monaco Biscuits",
    slug: "monaco-biscuits",
    category: "snacks",
    description: "Crunchy savory biscuits with unique taste",
    price: 50,
    originalPrice: 55,
    image: "/images/products/monaco.jpg",
    images: ["/images/products/monaco.jpg"],
    rating: 4.6,
    reviews: 189,
    stock: 110,
    sku: "MON-001",
    weight: "120g",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-007",
    name: "Parle Magix Biscuits",
    slug: "parle-magix",
    category: "biscuits",
    description: "Magic taste in every bite",
    price: 65,
    originalPrice: 75,
    image: "/images/products/magix.jpg",
    images: ["/images/products/magix.jpg"],
    rating: 4.5,
    reviews: 167,
    stock: 85,
    sku: "MAG-001",
    weight: "200g",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-008",
    name: "Parle Cashew Cookies",
    slug: "parle-cashew-cookies",
    category: "cookies",
    description: "Premium cookies with cashew pieces",
    price: 80,
    originalPrice: 90,
    image: "/images/products/cashew-cookies.jpg",
    images: ["/images/products/cashew-cookies.jpg"],
    rating: 4.8,
    reviews: 203,
    stock: 60,
    sku: "CAS-001",
    weight: "180g",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Save products individually
products.forEach((product) => {
  const categoryDir = path.join(productsDir, product.category);
  if (!fs.existsSync(categoryDir)) {
    fs.mkdirSync(categoryDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(categoryDir, `${product.slug}.json`),
    JSON.stringify(product, null, 2),
  );
});
console.log(`Created ${products.length} product files`);

// Create product index for fast search
const productIndex = {
  lastUpdated: new Date().toISOString(),
  products: products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    price: p.price,
    image: p.image,
    rating: p.rating,
  })),
};
fs.writeFileSync(
  path.join(dataDir, "product-index.json"),
  JSON.stringify(productIndex, null, 2),
);
console.log("Created product-index.json");

// Users data - with hashed passwords
const users = [
  {
    id: "user-001",
    email: "superadmin@parle.com",
    password: hashPassword("superadmin123"),
    name: "Super Admin",
    role: "super_admin",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "user-002",
    email: "admin@parle.com",
    password: hashPassword("admin123"),
    name: "Admin User",
    role: "admin",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "user-003",
    email: "moderator@parle.com",
    password: hashPassword("moderator123"),
    name: "Moderator",
    role: "moderator",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

fs.writeFileSync(
  path.join(dataDir, "users.json"),
  JSON.stringify(users, null, 2),
);
console.log("Created users.json with 3 admin users");

// Create empty orders file
fs.writeFileSync(
  path.join(dataDir, "orders.json"),
  JSON.stringify([], null, 2),
);
console.log("Created orders.json");

// Create settings file
const settings = {
  siteName: "Parle Bangladesh",
  siteUrl: "http://localhost:3000",
  logo: "/images/parle-logo.png",
  timezone: "Asia/Dhaka",
  currency: "BDT",
  currencySymbol: "৳",
  taxRate: 0.05,
  shippingCost: 50,
  jwtSecret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

fs.writeFileSync(
  path.join(dataDir, "settings.json"),
  JSON.stringify(settings, null, 2),
);
console.log("Created settings.json");

console.log("\n✅ Database seeding completed successfully!");
console.log("\n📝 Default Admin Credentials:");
console.log("Super Admin: superadmin@parle.com / superadmin123");
console.log("Admin: admin@parle.com / admin123");
console.log("Moderator: moderator@parle.com / moderator123");
