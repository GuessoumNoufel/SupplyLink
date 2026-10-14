import mongoose from "mongoose";

const accessCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ["activation", "renewal", "invite"],
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Owner",
      required: true,
    },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "Client" }, // for invites
    usedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("AccessCode", accessCodeSchema);
