import AttemptLock from "../models/AttemptLock.js";
import AppError from "./AppError.js";

export const MAX_ATTEMPTS = 5;
export const LOCK_MS = 10 * 60 * 1000;

export async function getLockRemainingMs(key) {
  const rec = await AttemptLock.findOne({
    key,
    lockedUntil: { $gt: new Date() },
  });
  return rec ? rec.lockedUntil.getTime() - Date.now() : 0;
}

export async function registerFailure(key) {
  if (!key) return;
  const now = new Date();

  // old record whose lock/window already ended (the TTL cleanup can be up to 60s late)
  await AttemptLock.deleteOne({
    key,
    $or: [{ expiresAt: { $lte: now } }, { lockedUntil: { $lte: now } }],
  });

  let rec;
  for (let i = 0; i < 2 && !rec; i++) {
    try {
      rec = await AttemptLock.findOneAndUpdate(
        { key },
        {
          $inc: { attempts: 1 },
          $set: { expiresAt: new Date(now.getTime() + LOCK_MS) },
        },
        { upsert: true, returnDocument: "after" },
      );
    } catch (err) {
      if (err.code !== 11000) throw err; // two requests created it at the same moment: retry
    }
  }

  if (rec && rec.attempts >= MAX_ATTEMPTS && !rec.lockedUntil) {
    await AttemptLock.updateOne(
      { _id: rec._id },
      { lockedUntil: new Date(now.getTime() + LOCK_MS) },
    );
  }
}

export const clearFailures = (key) =>
  key ? AttemptLock.deleteOne({ key }) : null;

// use this instead of `new AppError(...)` for errors that must count as a failed attempt
export async function failAttempt(req, message, status = 400) {
  await registerFailure(req.lockKey);
  return new AppError(message, status);
}
