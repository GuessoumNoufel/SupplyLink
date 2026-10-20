import Owner from "../models/Owner.js";
import AppError from "../utils/AppError.js";
import { getSubscriptionState } from "../utils/subscription.js";

export const requireSubscription = async (req, res, next) => {
  const owner = await Owner.findById(req.user.id).select("status validUntil");
  if (!owner) return next(new AppError("Owner not found", 401));

  const subscription = getSubscriptionState(owner);
  if (subscription.state === "expired" || subscription.state === "frozen") {
    return next(
      new AppError("Subscription expired", 403, "SUBSCRIPTION_EXPIRED"),
    );
  }

  req.subscription = subscription; // "active" or "grace"
  next();
};
