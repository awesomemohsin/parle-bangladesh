import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true, // Re-enable buffering to prevent immediate failures
      maxPoolSize: 20, 
      serverSelectionTimeoutMS: 15000, 
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000,
    };

    console.log("Connecting to MongoDB...");
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log("MongoDB Connected Successfully");
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    console.error("MongoDB Connection Error:", e);
    cached.promise = null; // Reset promise on error to allow retry
    throw e;
  }

  // Verify readyState
  if (mongoose.connection.readyState !== 1) {
    console.warn("MongoDB readyState is not 1 yet. State:", mongoose.connection.readyState);
    // Wait for a short bit if it's connecting
    if (mongoose.connection.readyState === 2) {
       await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return cached.conn;
}

export default connectDB;
