import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../src/models/User.js";

dotenv.config();

const dumpUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
    const users = await User.find({}, "name email");
    console.log("Registered Users:");
    users.forEach(u => console.log(`- ${u.name} (${u.email})`));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

dumpUsers();
