import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Admin from "../models/Admin.js";

await mongoose.connect(process.env.MONGO_URI);

if (await Admin.exists({})) {
  console.log("Admin already exists. Nothing done.");
} else {
  const password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
  await Admin.create({ email: process.env.ADMIN_EMAIL, password });
  console.log("Admin created.");
}

await mongoose.disconnect();
