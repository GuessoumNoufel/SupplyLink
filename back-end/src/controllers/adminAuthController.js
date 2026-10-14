import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";
import { signToken, revokeToken, cookieOptions } from "../utils/token.js";

export const login = async (req, res) => {
  const { email, password } = req.body || {};

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email ||
    !password
  ) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const admin = await Admin.findOne({
    email: email.toLowerCase().trim(),
  }).select("+password");
  const ok = admin && (await bcrypt.compare(password, admin.password));
  if (!ok)
    return res.status(401).json({ message: "Invalid email or password" });

  res.cookie("token", signToken(admin._id, "admin"), cookieOptions);
  res.json({ message: "Logged in", role: "admin" });
};

export const logout = async (req, res) => {
  await revokeToken(req);
  res.clearCookie("token", cookieOptions);
  res.json({ message: "Logged out" });
};

export const me = (req, res) =>
  res.json({ role: req.user.role, id: req.user.id });
