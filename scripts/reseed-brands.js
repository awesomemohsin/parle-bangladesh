const mongoose = require('mongoose');

const URI = 'mongodb://the_awesome:6nbKRW6KMSYaKIjx@ac-cprao47-shard-00-00.qgyhee2.mongodb.net:27017,ac-cprao47-shard-00-01.qgyhee2.mongodb.net:27017,ac-cprao47-shard-00-02.qgyhee2.mongodb.net:27017/parle?ssl=true&replicaSet=atlas-6d460f-shard-0&authSource=admin&retryWrites=true&w=majority&appName=parle-bangladesh';

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(URI);
    console.log('Connected!');

    const Brand = mongoose.models.Brand || mongoose.model('Brand', new mongoose.Schema({
      name: String,
      slug: String,
      category: String,
      description: String
    }, { timestamps: true }));

    const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({
      brand: String,
      category: String
    }, { strict: false }));

    const products = await Product.find({ brand: { $exists: true, $ne: '' } });
    const uniqueBrands = [...new Set(products.map(p => p.brand))];
    
    console.log(`Found ${uniqueBrands.length} unique brands across ${products.length} products.`);

    for (const brandName of uniqueBrands) {
      if (!brandName) continue;
      
      const slug = brandName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      const existing = await Brand.findOne({ slug });

      if (!existing) {
        // Find which category this brand belongs to based on one of its products
        const sampleProduct = products.find(p => p.brand === brandName);
        const category = sampleProduct?.category || 'biscuits';

        await Brand.create({
          name: brandName,
          slug,
          category,
          description: `All products under ${brandName}`
        });
        console.log(`Created brand: ${brandName} in ${category}`);
      } else if (!existing.category) {
        const sampleProduct = products.find(p => p.brand === brandName);
        existing.category = sampleProduct?.category || 'biscuits';
        await existing.save();
        console.log(`Updated existing brand: ${brandName} with category ${existing.category}`);
      } else {
         console.log(`Brand ${brandName} already exists in ${existing.category}`);
      }
    }

    console.log('Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
