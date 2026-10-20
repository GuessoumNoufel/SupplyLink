import mongoose from "mongoose";

const attemptLockSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  attempts: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, // auto-cleanup
});

export default mongoose.model("AttemptLock", attemptLockSchema);
