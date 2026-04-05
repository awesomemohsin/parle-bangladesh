const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Read MONGODB_URI from .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const MONGODB_URI = envFile.match(/MONGODB_URI=(.*)/)?.[1]?.trim()?.replace(/["']/g, '');

if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in .env.local');
  process.exit(1);
}

// --- MODELS ---
const Schema = mongoose.Schema;

const CategorySchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: String,
  image: String
}, { timestamps: true });

const VariationSchema = new Schema({
  weight: String,
  flavor: String,
  price: { type: Number, required: true },
  discountPrice: Number,
  stock: { type: Number, default: 0 },
  image: String,
  isDefault: { type: Boolean, default: false },
  isBulk: { type: Boolean, default: false }
});

const ProductSchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  category: { type: String, required: true },
  brand: { type: String },
  description: String,
  variations: [VariationSchema],
  images: [String],
  ordersCount: { type: Number, default: 0 },
  isBulk: { type: Boolean, default: false }
}, { timestamps: true });

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const NEW_CATEGORIES = [
  { 
    name: 'Biscuits', 
    slug: 'biscuits', 
    description: 'Fresh & crunchy Parle biscuits. India\'s favorite treat.', 
    image: '/images/categories/biscuits.webp' 
  },
  { 
    name: 'Wafers', 
    slug: 'wafers', 
    description: 'Crispy, light, and flavorful wafers.', 
    image: '/images/categories/wafers.webp' 
  }
];

const PRODUCTS = [
  // --- PARLE G ---
  {
    name: 'Parle-G Gold',
    slug: 'parle-g-gold',
    category: 'biscuits',
    brand: 'Parle-G',
    variations: [{ weight: '125g', price: 25, stock: 500, isDefault: true, image: '/images/products/parle-g/gold.webp' }]
  },
  {
    name: 'Parle-G Original',
    slug: 'parle-g-original',
    category: 'biscuits',
    brand: 'Parle-G',
    variations: [{ weight: '250g', price: 40, stock: 1000, isDefault: true, image: '/images/products/parle-g/original.webp' }]
  },
  
  // --- HIDE & SEEK ---
  {
    name: 'Hide & Seek Choco Chips',
    slug: 'hide-seek-choco-chips',
    category: 'biscuits',
    brand: 'Hide & Seek',
    variations: [{ weight: '82.5g', price: 50, stock: 400, isDefault: true, image: '/images/products/hide-seek/original.webp' }]
  },
  {
    name: 'Hide & Seek Bourbon',
    slug: 'hide-seek-bourbon',
    category: 'biscuits',
    brand: 'Hide & Seek',
    variations: [{ weight: '63g', price: 30, stock: 300, isDefault: true, image: '/images/products/hide-seek/bourbon.webp' }]
  },
  
  // --- KRACKJACK ---
  {
    name: 'Krackjack Original',
    slug: 'krackjack-original',
    category: 'biscuits',
    brand: 'Krackjack',
    variations: [{ weight: '150g', price: 45, stock: 300, isDefault: true, image: '/images/products/krackjack/original.webp' }]
  },
  
  // --- MONACO ---
  {
    name: 'Monaco Classic Salted',
    slug: 'monaco-classic',
    category: 'biscuits',
    brand: 'Monaco',
    variations: [{ weight: '150g', price: 40, stock: 300, isDefault: true, image: '/images/products/monaco/classic.webp' }]
  },
  
  // --- 20-20 ---
  {
    name: 'Parle 20-20 Cashew Cookies',
    slug: 'parle-20-20-cashew',
    category: 'biscuits',
    brand: '20-20',
    variations: [{ weight: '100g', price: 35, stock: 400, isDefault: true, image: '/images/products/20-20/cashew.webp' }]
  },
  
  // --- MAGIX ---
  {
    name: 'Parle Magix Choco Cream',
    slug: 'parle-magix-choco',
    category: 'biscuits',
    brand: 'Magix',
    variations: [{ weight: '150g', price: 65, stock: 200, isDefault: true, image: '/images/products/magix/choco.webp' }]
  },
  
  // --- FAB ---
  {
    name: 'Parle FAB Chocolate',
    slug: 'parle-fab-chocolate',
    category: 'biscuits',
    brand: 'Fab!',
    variations: [{ weight: '112g', price: 45, stock: 300, isDefault: true, image: '/images/products/fab/chocolate.webp' }]
  },

  // --- WAFERS ---
  {
    name: 'Parle Wafer Cream n Onion',
    slug: 'parle-wafer-cream-onion',
    category: 'wafers',
    brand: 'Parle Wafer',
    variations: [{ weight: '75g', price: 50, stock: 400, isDefault: true, image: '/images/products/wafers/cream-onion.webp' }]
  },
  {
    name: 'Parle Wafer Classic Salted',
    slug: 'parle-wafer-salted',
    category: 'wafers',
    brand: 'Parle Wafer',
    variations: [{ weight: '75g', price: 50, stock: 400, isDefault: true, image: '/images/products/wafers/salted.webp' }]
  }
];

async function reorganize() {
  try {
    console.log('🔄 STARTING DATA REORGANIZATION...');
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);

    console.log('Clearing existing collections...');
    await Category.deleteMany({});
    await Product.deleteMany({});

    console.log('Creating 2 primary categories...');
    await Category.insertMany(NEW_CATEGORIES);

    console.log('Inserting products with brands...');
    await Product.insertMany(PRODUCTS.map(p => ({
      ...p,
      images: p.variations.map(v => v.image)
    })));

    console.log('✅ REORGANIZATION COMPLETE');
    process.exit(0);
  } catch (error) {
    console.error('❌ REORGANIZATION FAILED:', error);
    process.exit(1);
  }
}

reorganize();
