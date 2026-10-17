import bcrypt from "bcryptjs";
import Owner from "../models/Owner.js";
import AccessCode from "../models/AccessCode.js";
import AppError from "../utils/AppError.js";
import addMonths from "../utils/addMonths.js";
import findValidCode from "../utils/findValidCode.js";
import { signToken, revokeToken, cookieOptions } from "../utils/token.js";
import EmailVerification from "../models/EmailVerification.js";
import { sendEmail } from "../utils/sendEmail.js";
import { isValidEmail, hasMailServer } from "../utils/validEmail.js";
import { randomInt } from "node:crypto";

export const sendEmailCode = async (req, res, next) => {
  const { code, email } = req.body || {};
  if (!isStr(code) || !isStr(email)) {
    return next(new AppError("Code and email are required", 400));
  }

  // only someone holding a valid activation code can trigger emails (anti-abuse)
  if (!(await findValidCode(code.trim().toUpperCase(), "activation"))) {
    return next(new AppError(INVALID_CODE, 400));
  }

  if (!isValidEmail(email) || !(await hasMailServer(email))) {
    return next(new AppError("Invalid email address", 400));
  }
  const cleanEmail = email.trim().toLowerCase();

  if (await Owner.exists({ email: cleanEmail })) {
    return next(new AppError("This email is already used", 409));
  }

  // 60 seconds between sends
  const existing = await EmailVerification.findOne({ email: cleanEmail });
  if (existing && Date.now() - existing.updatedAt.getTime() < 60 * 1000) {
    return next(
      new AppError("Please wait a minute before requesting another code", 429),
    );
  }

  // const emailCode = String(crypto.randomInt(100000, 1000000));
  const emailCode = String(randomInt(100000, 1000000));

  await EmailVerification.findOneAndUpdate(
    { email: cleanEmail },
    {
      codeHash: await bcrypt.hash(emailCode, 10),
      attempts: 0,
      verifiedAt: null,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
    { upsert: true },
  );

  await sendEmail({
    to: cleanEmail,
    subject: "Your SupplyLink verification code",
    text: `Your verification code is ${emailCode}. It expires in 10 minutes.`,
  });

  res.json({ message: "Verification code sent" });
};

export const verifyEmail = async (req, res, next) => {
  const { email, emailCode } = req.body || {};
  if (!isStr(email) || !isStr(emailCode)) {
    return next(new AppError("Email and code are required", 400));
  }

  const record = await EmailVerification.findOne({
    email: email.trim().toLowerCase(),
  });
  if (!record)
    return next(new AppError("Code expired, request a new one", 400));
  if (record.attempts >= 5) {
    return next(new AppError("Too many attempts, request a new code", 429));
  }

  if (!(await bcrypt.compare(emailCode.trim(), record.codeHash))) {
    record.attempts += 1;
    await record.save();
    return next(new AppError("Wrong code", 400));
  }

  record.verifiedAt = new Date();
  record.expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 30 min to finish the profile
  await record.save();

  res.json({ verified: true });
};

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

// export const activate = async (req, res, next) => {
//   const { code, name, phone, email, password, language, currency } =
//     req.body || {};

//   if (![code, name, phone, email, password].every(isStr)) {
//     return next(
//       new AppError("Code, name, phone, email and password are required", 400),
//     );
//   }
//   if (!EMAIL_RE.test(email.trim()))
//     return next(new AppError("Invalid email", 400));
//   if (password.length < 8) {
//     return next(new AppError("Password must be at least 8 characters", 400));
//   }
//   if (
//     (language && typeof language !== "string") ||
//     (currency && typeof currency !== "string")
//   ) {
//     return next(new AppError("Invalid language or currency", 400));
//   }

//   const record = await findValidCode(code.trim().toUpperCase(), "activation");
//   if (!record) return next(new AppError(INVALID_CODE, 400));

//   // consume the code atomically: only one request can win
//   const consumed = await AccessCode.findOneAndUpdate(
//     { _id: record._id, usedAt: null },
//     { usedAt: new Date() },
//   );
//   if (!consumed) return next(new AppError(INVALID_CODE, 400));

//   try {
//     const owner = await Owner.findById(record.owner);
//     if (!owner || owner.profileCompleted) throw new AppError(INVALID_CODE, 400);

//     owner.set({
//       name: name.trim(),
//       phone: phone.trim(),
//       email: email.trim().toLowerCase(),
//       password: await bcrypt.hash(password, 12),
//       ...(language && { language }),
//       ...(currency && { currency }),
//       profileCompleted: true,
//       status: "active",
//       validUntil: addMonths(new Date(), owner.periodMonths),
//     });
//     await owner.save();

//     res.cookie("token", signToken(owner._id, "owner"), cookieOptions);
//     res.status(201).json(cleanOwner(owner));
//   } catch (err) {
//     // saving failed (duplicate email, bad phone...): give the code back
//     await AccessCode.updateOne({ _id: record._id }, { usedAt: null });
//     next(err);
//   }
// };

export const activate = async (req, res, next) => {
  const { code, name, phone, email, password, language, currency } =
    req.body || {};

  if (![code, name, phone, email, password].every(isStr)) {
    return next(
      new AppError("Code, name, phone, email and password are required", 400),
    );
  }
  if (!isValidEmail(email))
    return next(new AppError("Invalid email address", 400));
  if (password.length < 8) {
    return next(new AppError("Password must be at least 8 characters", 400));
  }
  if (
    (language && typeof language !== "string") ||
    (currency && typeof currency !== "string")
  ) {
    return next(new AppError("Invalid language or currency", 400));
  }

  const cleanEmail = email.trim().toLowerCase();

  // 1. the email must have been verified with the code we sent
  const verified = await EmailVerification.findOne({
    email: cleanEmail,
    verifiedAt: { $ne: null },
  });
  if (!verified) return next(new AppError("Email not verified", 400));

  // 2. the activation code must be valid and unused
  const record = await findValidCode(code.trim().toUpperCase(), "activation");
  if (!record) return next(new AppError(INVALID_CODE, 400));
  if (!record.periodMonths) {
    return next(
      new AppError(
        "This code has no subscription period, ask for a new one",
        400,
      ),
    );
  }
  // 3. consume the code atomically (only one request can win)
  const consumed = await AccessCode.findOneAndUpdate(
    { _id: record._id, usedAt: null },
    { usedAt: new Date() },
  );
  if (!consumed) return next(new AppError(INVALID_CODE, 400));

  try {
    const owner = await Owner.findById(record.owner);
    if (!owner || owner.profileCompleted) throw new AppError(INVALID_CODE, 400);

    // console.log("periodMonths:", record.periodMonths);
    // console.log("validUntil:", addMonths(new Date(), record.periodMonths));

    owner.set({
      name: name.trim(),
      phone: phone.trim(),
      email: cleanEmail,
      password: await bcrypt.hash(password, 12),
      ...(language && { language }),
      ...(currency && { currency }),
      profileCompleted: true,
      status: "active",
      validUntil: addMonths(new Date(), record.periodMonths),
    });
    await owner.save();
    await EmailVerification.deleteOne({ _id: verified._id });

    res.cookie("token", signToken(owner._id, "owner"), cookieOptions);
    res.status(201).json(owner); // password is stripped by the toJSON transform
  } catch (err) {
    // anything failed (bad phone, duplicate...): give the code back
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
