export const GRACE_DAYS = 3;

export function getSubscriptionState(owner) {
  const validUntil = owner.validUntil ? new Date(owner.validUntil) : null;
  const graceEndsAt = validUntil
    ? new Date(validUntil.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000)
    : null;

  const now = Date.now();
  let state;
  if (owner.status === "frozen") state = "frozen";
  else if (!validUntil) state = "expired";
  else if (now <= validUntil.getTime()) state = "active";
  else if (now <= graceEndsAt.getTime()) state = "grace";
  else state = "expired";

  return { state, validUntil, graceEndsAt };
}
