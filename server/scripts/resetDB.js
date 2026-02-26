import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../src/models/User.js";
import { Room } from "../src/models/Room.js";

dotenv.config();

const resetDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
    
    await User.deleteMany({});
    console.log("Cleared Users collection");
    
    await Room.deleteMany({});
    console.log("Cleared Rooms collection");
    
    console.log("Database reset complete!");
    process.exit(0);
  } catch (err) {
    console.error("Error resetting database:", err);
    process.exit(1);
  }
};

resetDB();
