import mongoose from "mongoose";

const revokedTokenSchema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export default mongoose.model("RevokedToken", revokedTokenSchema);
