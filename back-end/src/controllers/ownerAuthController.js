import bcrypt from "bcryptjs";
import Owner from "../models/Owner.js";
import AccessCode from "../models/AccessCode.js";
import AppError from "../utils/AppError.js";
import addMonths from "../utils/addMonths.js";
import findValidCode from "../utils/findValidCode.js";
import { signToken, revokeToken, cookieOptions } from "../utils/token.js";

const isStr = (v) => typeof v === "string" && v.trim() !== "";
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const INVALID_CODE = "Invalid or expired code";

const cleanOwner = (owner) => {
  const { password, __v, ...safe } = owner.toObject();
  return safe;
};

export const verifyCode = async (req, res, next) => {
  const raw = req.body?.code;
  if (!isStr(raw)) return next(new AppError("Code is required", 400));

  const record = await findValidCode(raw.trim().toUpperCase(), "activation");
  if (!record) return next(new AppError(INVALID_CODE, 400));

  res.json({ valid: true });
};

export const activate = async (req, res, next) => {
  const { code, name, phone, email, password, language, currency } =
    req.body || {};

  if (![code, name, phone, email, password].every(isStr)) {
    return next(
      new AppError("Code, name, phone, email and password are required", 400),
    );
  }
  if (!EMAIL_RE.test(email.trim()))
    return next(new AppError("Invalid email", 400));
  if (password.length < 8) {
    return next(new AppError("Password must be at least 8 characters", 400));
  }
  if (
    (language && typeof language !== "string") ||
    (currency && typeof currency !== "string")
  ) {
    return next(new AppError("Invalid language or currency", 400));
  }

  const record = await findValidCode(code.trim().toUpperCase(), "activation");
  if (!record) return next(new AppError(INVALID_CODE, 400));

  // consume the code atomically: only one request can win
  const consumed = await AccessCode.findOneAndUpdate(
    { _id: record._id, usedAt: null },
    { usedAt: new Date() },
  );
  if (!consumed) return next(new AppError(INVALID_CODE, 400));

  try {
    const owner = await Owner.findById(record.owner);
    if (!owner || owner.profileCompleted) throw new AppError(INVALID_CODE, 400);

    owner.set({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      password: await bcrypt.hash(password, 12),
      ...(language && { language }),
      ...(currency && { currency }),
      profileCompleted: true,
      status: "active",
      validUntil: addMonths(new Date(), owner.periodMonths),
    });
    await owner.save();

    res.cookie("token", signToken(owner._id, "owner"), cookieOptions);
    res.status(201).json(cleanOwner(owner));
  } catch (err) {
    // saving failed (duplicate email, bad phone...): give the code back
    await AccessCode.updateOne({ _id: record._id }, { usedAt: null });
    next(err);
  }
};

export const login = async (req, res, next) => {
  const { email, password } = req.body || {};
  if (!isStr(email) || !isStr(password)) {
    return next(new AppError("Email and password are required", 400));
  }

  const owner = await Owner.findOne({
    email: email.trim().toLowerCase(),
  }).select("+password");
  const ok =
    owner &&
    owner.profileCompleted &&
    (await bcrypt.compare(password, owner.password));
  if (!ok) return next(new AppError("Invalid email or password", 401));

  res.cookie("token", signToken(owner._id, "owner"), cookieOptions);
  res.json(cleanOwner(owner));
};

export const logout = async (req, res) => {
  await revokeToken(req);
  res.clearCookie("token", cookieOptions);
  res.json({ message: "Logged out" });
};

export const me = async (req, res, next) => {
  const owner = await Owner.findById(req.user.id);
  if (!owner) return next(new AppError("Owner not found", 401));
  res.json(cleanOwner(owner));
};
