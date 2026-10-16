import AccessCode from "../models/AccessCode.js";

export default function findValidCode(code, type) {
  return AccessCode.findOne({
    code,
    type,
    usedAt: null,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  });
}
