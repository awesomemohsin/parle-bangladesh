import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("Please define the Database URI environment variable inside .env.local");
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  // If the connection is disconnected or disconnecting, clear the cached promise to force a new connection
  if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
    cached.conn = null;
    cached.promise = null;
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true, // Re-enable buffering to prevent immediate failures
      maxPoolSize: 20, 
      serverSelectionTimeoutMS: 5000, // Reduced to prevent long build-time hangs if DB is unreachable
      socketTimeoutMS: 30000, // Reduced to prevent hanging connection timeouts
      heartbeatFrequencyMS: 10000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null; // Reset promise on error to allow retry
    throw e;
  }

  // Verify readyState
  if (mongoose.connection.readyState !== 1) {
    // Wait for a short bit if it's connecting
    if (mongoose.connection.readyState === 2) {
       await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return cached.conn;
}

export default connectDB;
