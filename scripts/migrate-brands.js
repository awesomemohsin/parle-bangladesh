const mongoose = require('mongoose');

const URI = 'mongodb://the_awesome:6nbKRW6KMSYaKIjx@ac-cprao47-shard-00-00.qgyhee2.mongodb.net:27017,ac-cprao47-shard-00-01.qgyhee2.mongodb.net:27017,ac-cprao47-shard-00-02.qgyhee2.mongodb.net:27017/parle?ssl=true&replicaSet=atlas-6d460f-shard-0&authSource=admin&retryWrites=true&w=majority&appName=parle-bangladesh';

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(URI, {
      bufferCommands: false,
    });
    console.log('Connected!');

    const BrandSchema = new mongoose.Schema({
      name: String,
      category: String
    }, { strict: false });

    const Brand = mongoose.models.Brand || mongoose.model('Brand', BrandSchema);

    const brands = await Brand.find({});
    console.log(`Found ${brands.length} brands total.`);

    let updated = 0;
    for (const b of brands) {
      if (!b.category) {
        // Default everything to biscuits for now, user can change later
        b.category = 'biscuits';
        await b.save();
        updated++;
      }
    }

    console.log(`Successfully updated ${updated} brands to 'biscuits' category.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
