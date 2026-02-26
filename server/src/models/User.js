import mongoose from "mongoose";

const avatarSchema = new mongoose.Schema(
  {
    hairStyle: { type: Number, default: 1, min: 1, max: 6 },
    visorColor: { type: String, default: "#00f0ff" },
    armorColor: { type: String, default: "#1a1a2e" },
    emblem: { type: Number, default: 1, min: 1, max: 8 },
    glowColor: { type: String, default: "#00f0ff" }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatar: { type: avatarSchema, default: () => ({}) }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
