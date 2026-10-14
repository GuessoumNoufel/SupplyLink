import mongoose from "mongoose";

const ownerSchema = new mongoose.Schema(
  {
    // set by admin
    subscriptionType: { type: String, enum: ["pro", "ultra"], required: true },
    periodMonths: { type: Number, enum: [1, 3, 6, 12], default: 1 },
    status: {
      type: String,
      enum: ["pending", "active", "frozen"],
      default: "pending",
    },
    validUntil: { type: Date, default: null },

    // filled by the owner at first activation
    name: String,
    phone: {
      type: String,
      unique: true,
      sparse: true,
      match: [
        /^0[567]\d{8}$/,
        "Phone number must start with 05, 06, or 07 and contain exactly 10 digits",
      ],
    },
    email: { type: String, lowercase: true, unique: true, sparse: true },
    password: { type: String, select: false },
    language: { type: String, enum: ["en", "ar", "fr"], default: "en" },
    currency: { type: String, enum: ["DZD", "USD", "EUR"], default: "DZD" },
    profileCompleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model("Owner", ownerSchema);
