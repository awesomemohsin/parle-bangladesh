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

const VariationSchema = new Schema({
  image: String
}, { _id: false, strict: false });

const ProductSchema = new Schema({
  name: String,
  slug: String,
  brand: String,
  variations: [VariationSchema],
  images: [String]
}, { timestamps: true, strict: false });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function moveFolders() {
  try {
    console.log('🔄 STARTING PHYSICAL PRODUCT FOLDER CONSOLIDATION BY BRAND...');
    await mongoose.connect(MONGODB_URI);

    const products = await Product.find({});
    console.log(`Found ${products.length} products to process.`);

    const publicDir = path.join(process.cwd(), 'public');
    const imagesRoot = path.join(publicDir, 'images');

    for (const product of products) {
      if (!product.brand || !product.slug || !product.category) continue;

      const brandFolderName = product.brand.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
      // CATEGORY BASED ROOT
      const categoryPath = product.category === 'wafers' ? 'wafers' : 'biscuits';
      const targetBrandDir = path.join(imagesRoot, categoryPath, brandFolderName);
      const targetProductDir = path.join(targetBrandDir, product.slug);

      // IDENTIFY CURRENT SOURCE
      // Try to find if it's already in a brand folder (top level OR nested) OR original source
      const possibleSources = [
        path.join(imagesRoot, brandFolderName, product.slug),
        path.join(imagesRoot, categoryPath, brandFolderName, product.slug),
        path.join(imagesRoot, product.slug),
        path.join(imagesRoot, 'biscuits', product.slug),
        path.join(imagesRoot, 'chocolate-biscuits', product.slug),
        path.join(imagesRoot, 'crackers', product.slug),
        path.join(imagesRoot, 'cream-biscuits', product.slug),
        path.join(imagesRoot, 'fab-biscuits', product.slug),
        path.join(imagesRoot, 'healthy-snacks', product.slug),
        path.join(imagesRoot, 'wafers-chips', product.slug),
        // fallback to variation image path
        path.join(publicDir, path.dirname(product.variations[0]?.image || ''))
      ];

      let sourceAbsPath = null;
      for (const pPath of possibleSources) {
        if (fs.existsSync(pPath) && fs.statSync(pPath).isDirectory()) {
          sourceAbsPath = pPath;
          break;
        }
      }

      if (sourceAbsPath) {
        const sourceRelPathFromPublic = path.relative(publicDir, sourceAbsPath);
        // If the product is already in the final nested brand folder, skip file move
        if (sourceAbsPath.includes(categoryPath) && sourceAbsPath.includes(brandFolderName)) {
          console.log(`- Product ${product.slug} already in final destination. Skip file move.`);
        } else {
          // ENSURE the destination brand folder exists
          if (!fs.existsSync(targetBrandDir)) {
            fs.mkdirSync(targetBrandDir, { recursive: true });
          }

          // MOVE THE PRODUCT FOLDER
          try {
            console.log(`- Moving ${product.slug} from ${sourceRelPathFromPublic} to /images/${categoryPath}/${brandFolderName}`);
            if (fs.existsSync(targetProductDir)) {
              // Folder merge if target exists
              console.warn(`  ! Target ${targetProductDir} exists. Copying contents and deleting source.`);
              fs.cpSync(sourceAbsPath, targetProductDir, { recursive: true });
              fs.rmSync(sourceAbsPath, { recursive: true, force: true });
            } else {
              fs.renameSync(sourceAbsPath, targetProductDir);
            }
          } catch (e) {
            console.error(`  - Failed to move ${product.name}: ${e.message}`);
            continue;
          }
        }

        // 2. Update Database paths
        const newBaseUrl = `/images/${categoryPath}/${brandFolderName}/${product.slug}`;
        
        const updatedVariations = product.variations.map(v => {
          if (!v.image) return v;
          const fileName = path.basename(v.image);
          return { ...v, image: `${newBaseUrl}/${fileName}` };
        });

        const updatedImages = product.images.map(img => {
          const fileName = path.basename(img);
          return `${newBaseUrl}/${fileName}`;
        });

        await Product.updateOne(
          { _id: product._id },
          { 
            $set: { 
              variations: updatedVariations,
              images: updatedImages
            } 
          }
        );
        console.log(`  - Database updated for ${product.name}.`);
      } else {
        console.warn(`- Could not find folder for ${product.name} at any checked path.`);
      }
    }

    console.log('✅ REORGANIZATION COMPLETE');
    process.exit(0);
  } catch (error) {
    console.error('❌ REORGANIZATION FAILED:', error);
    process.exit(1);
  }
}

moveFolders();
