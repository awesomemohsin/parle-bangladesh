const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Manual env reading to avoid dependency issues
const envLocal = fs.readFileSync('.env.local', 'utf8');
const MONGODB_URI = envLocal.match(/MONGODB_URI=(.*)/)?.[1]?.trim()?.replace(/["']/g, '');

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
  description: String,
  variations: [VariationSchema],
  images: [String],
  ordersCount: { type: Number, default: 0 },
  isBulk: { type: Boolean, default: false }
}, { timestamps: true });

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const NEW_CATEGORIES = [
  { name: 'Biscuits', slug: 'biscuits', description: 'Basic biscuits for daily joy' },
  { name: 'Chocolate Biscuits', slug: 'chocolate-biscuits', description: 'Hide & Seek Series and chocolate delights' },
  { name: 'Cream Biscuits', slug: 'cream-biscuits', description: 'Premium cream filled biscuits and cookies' },
  { name: 'FAB Biscuits', slug: 'fab-biscuits', description: 'Delicious FAB series in multiple flavors' },
  { name: 'Crackers', slug: 'crackers', description: 'Crispy and light crackers' },
  { name: 'Healthy Snacks', slug: 'healthy-snacks', description: 'Nutricrunch and diet friendly options' },
  { name: 'Wafers & Chips', slug: 'wafers-chips', description: 'Parle Wafer and crispy snacks' }
];

const PRODUCTS = [
  // --- BISCUITS ---
  {
    name: 'Parle G Gold',
    slug: 'parle-g-gold',
    category: 'biscuits',
    description: 'The golden version of India\'s favorite biscuit.',
    variations: [
      { weight: '125g', price: 25, stock: 500, isDefault: true, image: '/images/products/parle-g-gold.jpg' }
    ]
  },
  {
    name: 'Parle G Oats & Berries',
    slug: 'parle-g-oats-berries',
    category: 'biscuits',
    description: 'Healthy twist to the classic Parle-G.',
    variations: [
      { weight: '93.8g', price: 30, stock: 300, isDefault: true, image: '/images/products/parle-g-oats-berries.jpg' }
    ]
  },
  {
    name: 'Krack Jack',
    slug: 'krack-jack',
    category: 'biscuits',
    description: 'Sweet and salty cracker biscuit.',
    variations: [
      { flavor: 'Original', weight: '60g × 5 pack (300g)', price: 150, stock: 200, isDefault: true, isBulk: true, image: '/images/products/krack-jack.jpg' }
    ],
    isBulk: true
  },

  // --- CHOCOLATE BISCUITS ---
  {
    name: 'Hide & Seek Choco Chips',
    slug: 'hide-seek-choco-chips',
    category: 'chocolate-biscuits',
    variations: [
      { weight: '22g', price: 15, stock: 1000 },
      { weight: '82.5g', price: 50, stock: 500, isDefault: true }
    ],
  },
  {
    name: 'Hide & Seek Caffemocha',
    slug: 'hide-seek-caffemocha',
    category: 'chocolate-biscuits',
    variations: [
      { weight: '75g', price: 50, stock: 300, isDefault: true }
    ],
  },
  {
    name: 'Hide & Seek American Cashew Butter',
    slug: 'hide-seek-cashew-butter',
    category: 'chocolate-biscuits',
    variations: [
      { weight: '91.74g', price: 60, stock: 300, isDefault: true }
    ],
  },
  {
    name: 'Hide & Seek Choco Rolls',
    slug: 'hide-seek-choco-rolls',
    category: 'chocolate-biscuits',
    variations: [
      { weight: '75g', price: 100, stock: 200, isDefault: true },
      { weight: '300g', price: 350, stock: 100, isBulk: true }
    ],
  },
  {
    name: 'Hide & Seek Chox CKS',
    slug: 'hide-seek-chox-cks',
    category: 'chocolate-biscuits',
    variations: [
      { weight: '75g', price: 80, stock: 200, isDefault: true }
    ],
  },
  {
    name: 'Hide & Seek Triple Delight',
    slug: 'hide-seek-triple-delight',
    category: 'chocolate-biscuits',
    variations: [
      { weight: '350g Tin', price: 550, stock: 50, isDefault: true, isBulk: true }
    ],
    isBulk: true
  },
  {
    name: 'Hide & Seek (Bulk Pack)',
    slug: 'hide-seek-bulk',
    category: 'chocolate-biscuits',
    variations: [
      { weight: '412.5g', price: 250, stock: 100, isDefault: true, isBulk: true }
    ],
    isBulk: true
  },

  // --- CREAM BISCUITS ---
  {
    name: 'Hide & Seek Bourbon',
    slug: 'hide-seek-bourbon',
    category: 'cream-biscuits',
    variations: [
      { flavor: 'Regular', weight: '63g', price: 30, isDefault: true },
      { flavor: 'Black Chocolate', weight: '100g', price: 60 },
      { flavor: 'Black Vanilla', weight: '100g', price: 60 }
    ],
  },
  {
    name: 'Kreams Bourbon',
    slug: 'kreams-bourbon',
    category: 'cream-biscuits',
    variations: [
      { weight: '75g', price: 35, stock: 300, isDefault: true }
    ],
  },
  {
    name: 'Hide & Seek Centre Filled Cookies',
    slug: 'hide-seek-centre-filled',
    category: 'cream-biscuits',
    variations: [
      { flavor: 'Chocolate', weight: '75g', price: 120, isDefault: true },
      { flavor: 'Mixed Berries', weight: '75g', price: 120 },
      { flavor: 'Hazelnut', weight: '60g', price: 120 }
    ],
  },
  {
    name: 'Jam-In Cream Biscuits',
    slug: 'jam-in-cream',
    category: 'cream-biscuits',
    variations: [
      { weight: '70g', price: 40, stock: 300, isDefault: true }
    ],
  },

  // --- FAB BISCUITS ---
  {
    name: 'FAB Chocolate', slug: 'fab-chocolate', category: 'fab-biscuits',
    variations: [
      { weight: '25g', price: 10 },
      { weight: '50g', price: 20 },
      { weight: '112g', price: 45, isDefault: true }
    ]
  },
  {
    name: 'FAB Vanilla', slug: 'fab-vanilla', category: 'fab-biscuits',
    variations: [
      { weight: '25g', price: 10 },
      { weight: '50g', price: 20 },
      { weight: '112g', price: 45, isDefault: true }
    ]
  },
  {
    name: 'FAB Orange', slug: 'fab-orange', category: 'fab-biscuits',
    variations: [
      { weight: '25g', price: 10 },
      { weight: '112g', price: 45, isDefault: true }
    ]
  },
  {
    name: 'FAB Strawberry', slug: 'fab-strawberry', category: 'fab-biscuits',
    variations: [
      { weight: '25g', price: 10 },
      { weight: '112g', price: 45, isDefault: true }
    ]
  },

  // --- CRACKERS ---
  {
    name: 'Nutricrunch Lite Cracker',
    slug: 'nutricrunch-lite-cracker',
    category: 'crackers',
    variations: [
      { weight: '100g', price: 35, stock: 400, isDefault: true }
    ]
  },

  // --- HEALTHY SNACKS ---
  {
    name: 'Nutricrunch Cookies',
    slug: 'nutricrunch-cookies',
    category: 'healthy-snacks',
    variations: [
      { flavor: 'Banana Cinnamon Oat', weight: '75g', price: 60, isDefault: true },
      { flavor: 'Cranberry Cashew & Oats', weight: '75g', price: 60 }
    ]
  },

  // --- WAFERS & CHIPS ---
  {
    name: 'Parle Wafer',
    slug: 'parle-wafer',
    category: 'wafers-chips',
    variations: [
      { flavor: 'Cream n\' Onion', weight: '75g', price: 50, isDefault: true },
      { flavor: 'Tangy Tomato', weight: '75g', price: 50 },
      { flavor: 'Piri Piri', weight: '75g', price: 50 },
      { flavor: 'Classic Salted', weight: '75g', price: 50 }
    ]
  }
];

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);

    // 1. CLEAR COLLECTIONS
    console.log('Clearing existing categories and products...');
    await Category.deleteMany({});
    await Product.deleteMany({});

    // 2. SEED CATEGORIES
    console.log('Seeding new categories...');
    await Category.insertMany(NEW_CATEGORIES);

    // 3. SEED PRODUCTS
    console.log('Seeding restructured products...');
    // We add placeholder images and ensure every variation has one if possible
    const productsToInsert = PRODUCTS.map(p => {
      // Ensure product level isBulk is set if any variation isBulk
      const hasBulkVar = p.variations.some(v => v.isBulk);
      return {
        ...p,
        isBulk: p.isBulk || hasBulkVar,
        variations: p.variations.map((v, i) => ({
          ...v,
          stock: v.stock || 100,
          // Placeholder image path based on category/slug/flavor context if missing
          image: v.image || `/images/${p.category}/${p.slug}/${(v.flavor || 'main').toLowerCase().replace(/\s+/g, '-')}.webp`
        }))
      };
    });
    await Product.insertMany(productsToInsert);

    console.log('Migration completed successfully in database.');
    
    // 4. REORGANIZE FOLDERS (Placeholder logic - manually verify folders)
    console.log('Migration script finished. Please check your public/images folder structure manually to match categories.');

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
