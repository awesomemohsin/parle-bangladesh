const mongoose = require('mongoose');

const URI = 'mongodb://the_awesome:6nbKRW6KMSYaKIjx@ac-cprao47-shard-00-00.qgyhee2.mongodb.net:27017,ac-cprao47-shard-00-01.qgyhee2.mongodb.net:27017,ac-cprao47-shard-00-02.qgyhee2.mongodb.net:27017/parle?ssl=true&replicaSet=atlas-6d460f-shard-0&authSource=admin&retryWrites=true&w=majority&appName=parle-bangladesh';

async function merge() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(URI);
    console.log('Connected!');

    const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({
      brand: String,
      category: String
    }, { strict: false }));

    const res = await Product.updateMany({ brand: 'Jam-In' }, { brand: 'Fab!' });
    console.log(`Merged ${res.modifiedCount} Jam-In products into Fab! brand.`);

    const Brand = mongoose.models.Brand || mongoose.model('Brand', new mongoose.Schema({
      name: String,
      slug: String
    }, { strict: false }));

    await Brand.deleteOne({ name: 'Jam-In' });
    console.log('Deleted Jam-In brand entry.');

    process.exit(0);
  } catch (err) {
    console.error('Merge failed:', err);
    process.exit(1);
  }
}

merge();
