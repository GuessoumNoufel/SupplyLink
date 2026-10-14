import { verifyToken, extractToken } from "../utils/token.js";
import RevokedToken from "../models/RevokedToken.js";

export const protect =
  (...roles) =>
  async (req, res, next) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    try {
      const payload = verifyToken(token);

      if (!payload.jti || (await RevokedToken.exists({ jti: payload.jti }))) {
        return res
          .status(401)
          .json({ message: "Session ended, please log in again" });
      }

      if (roles.length && !roles.includes(payload.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      req.user = { id: payload.id, role: payload.role };
      next();
    } catch {
      res.status(401).json({ message: "Invalid or expired token" });
    }
  };
