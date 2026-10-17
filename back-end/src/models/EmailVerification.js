import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, unique: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    verifiedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // auto-deleted
  },
  { timestamps: true },
);

export default mongoose.model("EmailVerification", schema);
