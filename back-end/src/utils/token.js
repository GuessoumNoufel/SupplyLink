import jwt from "jsonwebtoken";
import crypto from "crypto";
import RevokedToken from "../models/RevokedToken.js";

export const signToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    jwtid: crypto.randomUUID(),
  });

export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

export const extractToken = (req) => {
  const header = req.headers.authorization;
  return (
    req.cookies?.token ||
    (header?.startsWith("Bearer ") ? header.slice(7) : null)
  );
};

export const revokeToken = async (req) => {
  const token = extractToken(req);
  if (!token) return;
  try {
    const { jti, exp } = verifyToken(token);
    await RevokedToken.updateOne(
      { jti },
      { jti, expiresAt: new Date(exp * 1000) },
      { upsert: true },
    );
  } catch {
    // already invalid or expired: nothing to revoke
  }
};

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 24 * 60 * 60 * 1000,
};
