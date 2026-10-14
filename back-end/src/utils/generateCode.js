import crypto from "crypto";

// no 0/O, 1/I/L to avoid confusion when sharing codes
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateCode(length) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return code;
}

export const CODE_LENGTH = { activation: 12, renewal: 9, invite: 8 };
