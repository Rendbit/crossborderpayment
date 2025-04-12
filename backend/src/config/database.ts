import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Destructure the MONGO_URI from process.env
const { MONGO_URI } = process.env;

/**
 * Connect to MongoDB using Mongoose
 */
const connectDB = async (): Promise<void> => {
  try {
    if (!MONGO_URI) {
      throw new Error("❌ MONGO_URI is not defined in environment variables");
    }

    // Connect to MongoDB using mongoose
    await mongoose.connect(MONGO_URI, {} as mongoose.ConnectOptions);

    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    process.exit(1); // Exit process on failure
  }
};

export default connectDB;
