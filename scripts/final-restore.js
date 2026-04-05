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
    image: '/images/biscuits/biscuits.webp' 
  },
  { 
    name: 'Wafers', 
    slug: 'wafers', 
    description: 'Crispy, light, and flavorful wafers.', 
    image: '/images/wafers-chips/parle-wafer/cream-n-onion.webp' 
  }
];

// Product mapping function to determine brand and category
const getRestructuredProduct = (p) => {
  let brand = 'Parle';
  const name = p.name || '';
  if (name.includes('Hide & Seek')) brand = 'Hide & Seek';
  else if (name.includes('Parle G') || name.includes('Parle-G')) brand = 'Parle-G';
  else if (name.includes('Krack Jack')) brand = 'KrackJack';
  else if (name.includes('FAB')) brand = 'Fab!';
  else if (name.includes('Nutricrunch')) brand = 'Nutricrunch';
  else if (name.includes('Kreams')) brand = 'Kreams';
  else if (name.includes('Jam-In')) brand = 'Jam-In';
  else if (name.includes('Monaco')) brand = 'Monaco';
  else if (name.includes('Magix')) brand = 'Magix';
  else if (name.includes('Gluco')) brand = 'Gluco';
  else if (name.includes('Parle Wafer')) brand = 'Parle Wafer';

  const category = (p.category === 'wafers-chips' || name.toLowerCase().includes('wafer')) ? 'wafers' : 'biscuits';

  return {
    ...p,
    category,
    brand,
    // Add additional image logic if needed, but per original script variations already have images
    images: p.images || [p.variations.find(v => v.isDefault)?.image].filter(Boolean)
  };
};

const PRODUCTS_FROM_RESTRUCTURE_JS = [
  // COPIED EXACTLY FROM scripts/restructure-data.js FOR PRICE & IMAGE RESTORATION
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
  {
    name: 'Nutricrunch Lite Cracker',
    slug: 'nutricrunch-lite-cracker',
    category: 'crackers',
    variations: [
      { weight: '100g', price: 35, stock: 400, isDefault: true }
    ]
  },
  {
    name: 'Nutricrunch Cookies',
    slug: 'nutricrunch-cookies',
    category: 'healthy-snacks',
    variations: [
      { flavor: 'Banana Cinnamon Oat', weight: '75g', price: 60, isDefault: true },
      { flavor: 'Cranberry Cashew & Oats', weight: '75g', price: 60 }
    ]
  },
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

async function runRestore() {
  try {
    console.log('🔄 RESTORING ORIGINAL PRICES AND IMAGE PATHS...');
    await mongoose.connect(MONGODB_URI);

    console.log('Clearing existing collections...');
    await Category.deleteMany({});
    await Product.deleteMany({});

    console.log('Seeding Biscuits & Wafers...');
    await Category.insertMany(NEW_CATEGORIES);

    console.log('Inserting products with original data...');
    const productsToInsert = PRODUCTS_FROM_RESTRUCTURE_JS.map(p => {
      const brandObj = getRestructuredProduct(p);
      // Construct proper image paths for each variation
      const variations = p.variations.map(v => ({
        ...v,
        stock: v.stock || 100,
        image: v.image || `/images/${p.category}/${p.slug}/${(v.flavor || 'main').toLowerCase().replace(/\s+/g, '-')}.webp`
      }));

      return {
        ...brandObj,
        variations,
        images: variations.map(v => v.image)
      };
    });
    
    await Product.insertMany(productsToInsert);

    console.log('✅ RESTORATION SUCCESSFUL');
    process.exit(0);
  } catch (error) {
    console.error('❌ RESTORATION FAILED:', error);
    process.exit(1);
  }
}

runRestore();
