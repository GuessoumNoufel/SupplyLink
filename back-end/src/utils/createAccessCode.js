import AccessCode from "../models/AccessCode.js";
import { generateCode, CODE_LENGTH } from "./generateCode.js";

export async function createAccessCode({
  periodMonths,
  type,
  owner,
  client,
  expiresInDays,
}) {
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  // retry in the (very unlikely) case of a duplicate code
  for (let i = 0; i < 5; i++) {
    try {
      return await AccessCode.create({
        code: generateCode(CODE_LENGTH[type]),
        type,
        owner,
        client,
        periodMonths,
        expiresAt,
      });
    } catch (err) {
      if (err.code !== 11000) throw err;
    }
  }
  throw new Error("Could not generate a unique code");
}
