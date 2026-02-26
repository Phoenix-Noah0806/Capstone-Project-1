import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const router = express.Router();

const signToken = (user) =>
  jwt.sign({ id: user._id, name: user.name, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });

const userPayload = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar || {}
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });
    const token = signToken(user);
    return res.status(201).json({
      token,
      user: userPayload(user)
    });
  } catch (err) {
    console.error("Register error:", err.message);
    return res.status(500).json({ message: "Server error – please try again" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: userPayload(user)
    });
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ message: "Server error – please try again" });
  }
});

router.get("/me", async (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: "Missing auth token" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("name email avatar");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({ user: userPayload(user) });
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
});

router.put("/avatar", async (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: "Missing auth token" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { hairStyle, visorColor, armorColor, emblem, glowColor } = req.body;
    const update = {};
    if (hairStyle !== undefined) update["avatar.hairStyle"] = hairStyle;
    if (visorColor !== undefined) update["avatar.visorColor"] = visorColor;
    if (armorColor !== undefined) update["avatar.armorColor"] = armorColor;
    if (emblem !== undefined) update["avatar.emblem"] = emblem;
    if (glowColor !== undefined) update["avatar.glowColor"] = glowColor;

    const user = await User.findByIdAndUpdate(payload.id, { $set: update }, { new: true });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({ user: userPayload(user) });
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
});

export default router;
