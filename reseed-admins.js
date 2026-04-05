const mongoose = require('mongoose');
const crypto = require('crypto');

const URI = "mongodb://the_awesome:6nbKRW6KMSYaKIjx@ac-cprao47-shard-00-00.qgyhee2.mongodb.net:27017,ac-cprao47-shard-00-01.qgyhee2.mongodb.net:27017,ac-cprao47-shard-00-02.qgyhee2.mongodb.net:27017/parle?ssl=true&replicaSet=atlas-6d460f-shard-0&authSource=admin&retryWrites=true&w=majority&appName=parle-bangladesh";

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function run() {
  await mongoose.connect(URI);
  console.log('Connected to MongoDB');

  const UserSchema = new mongoose.Schema({
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    password: { type: String },
    name: { type: String, required: true },
    role: { type: String, default: "customer" },
    status: { type: String, default: "active" },
  }, { strict: false });

  // Explicitly mapping models to specific collections as seen in models.ts
  const User = mongoose.models.User || mongoose.model("User", UserSchema, "users");
  const Admin = mongoose.models.Admin || mongoose.model("Admin", UserSchema, "admins");

  // Delete all existing owners and super_admins from BOTH collections
  const rolesToDelete = ["owner", "super_admin"];
  
  const delUsers = await User.deleteMany({ role: { $in: rolesToDelete } });
  console.log(`Deleted ${delUsers.deletedCount} users from users collection`);
  
  const delAdmins = await Admin.deleteMany({ role: { $in: rolesToDelete } });
  console.log(`Deleted ${delAdmins.deletedCount} users from admins collection`);

  const pw = hashPassword("parle123");

  const newUsers = [
    {
      name: "Razu",
      email: "razu@parle.com",
      mobile: "01700000001",
      password: pw,
      role: "owner",
      status: "active"
    },
    {
      name: "Anindo",
      email: "anindo@parle.com",
      mobile: "01700000002",
      password: pw,
      role: "super_admin",
      status: "active"
    },
    {
      name: "Saiful",
      email: "saiful@parle.com",
      mobile: "01700000003",
      password: pw,
      role: "super_admin",
      status: "active"
    }
  ];

  // We add to admins collection as they are administrative users
  for (const u of newUsers) {
    await Admin.create(u);
    console.log(`Created authorized user: ${u.name} as ${u.role}`);
  }

  console.log('Reseed complete!');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
