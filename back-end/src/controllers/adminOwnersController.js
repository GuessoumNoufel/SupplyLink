import mongoose from "mongoose";
import Owner from "../models/Owner.js";
import AccessCode from "../models/AccessCode.js";
import { createAccessCode } from "../utils/createAccessCode.js";
import AppError from "../utils/AppError.js";
import { getSubscriptionState } from "../utils/subscription.js";

const PLANS = ["pro", "ultra"];
const PERIODS = [1, 3, 6, 12];
const ACTIVATION_VALID_DAYS = 30;

export const createOwner = async (req, res, next) => {
  const { label, subscriptionType = "pro", periodMonths = 1 } = req.body || {};

  // const ownerExist = await Owner.findOne({ label });
  // console.log(ownerExist?.label);

  // if (ownerExist?.lable) {
  //   console.log("repeated");
  // }

  if (typeof label !== "string" || !label.trim()) {
    return next(new AppError("Label is required", 400));
  }
  if (!PLANS.includes(subscriptionType)) {
    return res
      .status(400)
      .json({ message: "subscriptionType must be pro or ultra" });
  }
  if (!PERIODS.includes(Number(periodMonths))) {
    return res
      .status(400)
      .json({ message: "periodMonths must be 1, 3, 6 or 12" });
  }

  const owner = await Owner.create({
    label,
    subscriptionType,
    periodMonths: Number(periodMonths),
  });

  const code = await createAccessCode({
    type: "activation",
    owner: owner._id,
    periodMonths: Number(periodMonths),
    expiresInDays: ACTIVATION_VALID_DAYS,
  });

  res
    .status(201)
    .json({ owner, activationCode: code.code, expiresAt: code.expiresAt });
};

export const listOwners = async (req, res, next) => {
  const owners = await Owner.find().sort({ createdAt: -1 }).lean();

  const codes = await AccessCode.find({
    owner: { $in: owners.map((o) => o._id) },
    type: { $in: ["activation", "renewal"] },
    usedAt: null,
    expiresAt: { $gt: new Date() },
  }).lean();

  const byOwner = {};
  for (const c of codes) {
    byOwner[String(c.owner)] = {
      ...byOwner[String(c.owner)],
      [c.type]: c.code,
    };
  }

  res.json(
    owners.map((o) => ({
      ...o,
      activationCode: byOwner[String(o._id)]?.activation || null,
      renewalCode: byOwner[String(o._id)]?.renewal || null,
      subscription: getSubscriptionState(o),
    })),
  );
};

export const setOwnerStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!mongoose.isValidObjectId(id))
    return res.status(400).json({ message: "Invalid id" });
  if (!["frozen", "active"].includes(status)) {
    return res.status(400).json({ message: "status must be frozen or active" });
  }

  const owner = await Owner.findById(id);
  if (!owner) return res.status(404).json({ message: "Owner not found" });

  if (status === "frozen" && owner.status !== "active") {
    return res
      .status(400)
      .json({ message: "Only an active owner can be frozen" });
  }
  if (status === "active" && owner.status !== "frozen") {
    return res
      .status(400)
      .json({ message: "Only a frozen owner can be unfrozen" });
  }

  owner.status = status;
  await owner.save();
  res.json(owner);
};

export const deleteOwner = async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id))
    return res.status(400).json({ message: "Invalid id" });

  const owner = await Owner.findByIdAndDelete(id);
  if (!owner) return res.status(404).json({ message: "Owner not found" });

  await AccessCode.deleteMany({ owner: id });
  // later: also delete this owner's clients, products, orders...

  res.json({ message: "Owner removed" });
};

const RENEWAL_VALID_DAYS = 30;

export const createRenewalCode = async (req, res, next) => {
  const { id } = req.params;
  const { periodMonths } = req.body || {};

  if (!mongoose.isValidObjectId(id))
    return next(new AppError("Invalid id", 400));
  if (!PERIODS.includes(Number(periodMonths))) {
    return next(new AppError("periodMonths must be 1, 3, 6 or 12", 400));
  }

  const owner = await Owner.findById(id);
  if (!owner) return next(new AppError("Owner not found", 404));
  if (!owner.profileCompleted) {
    return next(
      new AppError("Owner has not activated yet, use the activation code", 400),
    );
  }
  if (owner.status === "frozen") {
    return next(new AppError("Owner is frozen, unfreeze first", 400));
  }

  // only one usable renewal code per owner
  await AccessCode.deleteMany({ owner: id, type: "renewal", usedAt: null });

  const code = await createAccessCode({
    type: "renewal",
    owner: id,
    periodMonths: Number(periodMonths),
    expiresInDays: RENEWAL_VALID_DAYS,
  });

  res.status(201).json({
    renewalCode: code.code,
    periodMonths: code.periodMonths,
    expiresAt: code.expiresAt,
  });
};
