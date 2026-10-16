import dns from "node:dns/promises";

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;

// format check (sync)
export function isValidEmail(email) {
  if (typeof email !== "string") return false;
  const e = email.trim();
  return e.length <= 254 && !e.includes("..") && EMAIL_RE.test(e);
}

// does the domain actually receive mail? (async)
export async function hasMailServer(email) {
  const domain = email.trim().split("@")[1];
  try {
    const records = await dns.resolveMx(domain);
    return records.length > 0;
  } catch (err) {
    // domain doesn't exist or has no mail records: reject
    // anything else (timeout, DNS server down): don't block the user
    return !["ENOTFOUND", "ENODATA"].includes(err.code);
  }
}
