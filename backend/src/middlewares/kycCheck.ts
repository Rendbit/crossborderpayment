import { NextFunction } from "express";
import { User } from "../models/User";
import { COMPLIANCE_CONFIG } from "../common/constants/compliance";
import { TransactionType } from "../common/enums/transaction";

export const kycCheck = async (req: any, res: any, next: NextFunction) => {
  try {
    const userId = req.user?._id || req.body.userId;
    const transactionType = req.body.transactionType as TransactionType;

    if (!userId || !transactionType) {
      return next();
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const tierLimits = COMPLIANCE_CONFIG.VELOCITY_LIMITS[user.kycTier];

    // Check if user can use app
    if (!tierLimits.canUseApp) {
      return res.status(403).json({
        error: "Account verification required",
        message: "Please complete account verification to use this feature",
      });
    }

    // Check if transaction type is allowed
    if (!tierLimits.allowedTransactionTypes.includes(transactionType)) {
      return res.status(403).json({
        error: "Transaction type not allowed",
        message: `This transaction requires ${
          user.kycTier === 0 ? "Basic" : "Standard"
        } verification`,
        requiredVerification: user.kycTier === 0 ? "BASIC" : "STANDARD",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
