import AppError from "../utils/AppError.js";
import { getLockRemainingMs } from "../utils/attemptLock.js";

export const lockGuard = (getKey) => async (req, res, next) => {
  req.lockKey = getKey(req) || null;

  if (req.lockKey) {
    const ms = await getLockRemainingMs(req.lockKey);
    if (ms > 0) {
      res.set("Retry-After", String(Math.ceil(ms / 1000)));
      return next(
        new AppError(
          `Too many failed attempts. Try again in ${Math.ceil(ms / 60000)} minute(s)`,
          429,
          "TOO_MANY_ATTEMPTS",
        ),
      );
    }
  }
  next();
};

// key builders
export const codeKey = (req) => `code:${req.ip}`;
export const renewKey = (req) => `renew:${req.user.id}`;
export const adminLoginKey = (req) => `login:admin:${req.ip}`;
export const ownerLoginKey = (req) => {
  const email = req.body?.email;
  return typeof email === "string" && email.trim()
    ? `login:owner:${email.trim().toLowerCase()}:${req.ip}`
    : null; // no email: the controller rejects it, nothing to count
};
