import { User } from "../../models/User";
import { COMPLIANCE_CONFIG } from "../../common/constants/compliance";
import { TransactionType } from "../../common/enums/transaction";
import { KycTier } from "../../common/enums/kyc";
import { VelocityCheckResult } from "../../types/compliance";

export class VelocityCheckService {
  /**
   * Check velocity limits - ONLY DAILY LIMITS RESTRICT TRANSACTIONS
   * Weekly/Monthly are for monitoring/suggestions only
   */
  async checkVelocity(
    userId: string,
    amount: number,
    transactionType: TransactionType
  ): Promise<VelocityCheckResult> {
    const user = await User.findById(userId);
    if (!user) {
      return { allowed: false, reason: "User not found" };
    }

    const tierLimits =
      COMPLIANCE_CONFIG.VELOCITY_LIMITS[user.kycTier as KycTier];
    if (!tierLimits) {
      return { allowed: false, reason: "Invalid KYC tier" };
    }

    // Check if transaction type is allowed
    if (!tierLimits.allowedTransactionTypes.includes(transactionType)) {
      return {
        allowed: false,
        reason: `This transaction type requires ${
          user.kycTier === 0 ? "Basic" : "Standard"
        } verification`,
        limits: this.getLimitInfo(user, transactionType),
      };
    }

    // Check single transaction limit
    if (amount > tierLimits.singleLimit) {
      return {
        allowed: false,
        reason: `Maximum per transaction is $${tierLimits.singleLimit}. Please split into smaller amounts.`,
        limits: this.getLimitInfo(user, transactionType),
      };
    }

    // Get usage
    const usageField: any = this.getUsageField(transactionType);
    const dailyUsed = user.dailyLimitUsed[usageField] || 0;

    // ONLY CHECK DAILY LIMIT (restricts transactions)
    if (dailyUsed + amount > tierLimits.dailyLimit) {
      const remaining = tierLimits.dailyLimit - dailyUsed;
      return {
        allowed: false,
        reason: `Daily limit reached. You have $${remaining} remaining. Resets at midnight.`,
        limits: this.getLimitInfo(user, transactionType, dailyUsed),
      };
    }

    // WEEKLY/MONTHLY LIMITS DO NOT RESTRICT - They are for monitoring only
    // We still track them for suggestions and risk scoring

    return {
      allowed: true,
      limits: this.getLimitInfo(user, transactionType, dailyUsed),
    };
  }

  private getUsageField(
    transactionType: TransactionType
  ): keyof typeof User.prototype.dailyLimitUsed {
    switch (transactionType) {
      case TransactionType.FIAT_TO_CRYPTO:
        return "fiatToCrypto";
      case TransactionType.CRYPTO_TO_FIAT:
        return "cryptoToFiat";
      case TransactionType.CRYPTO_TO_CRYPTO:
        return "cryptoToCrypto";
      case TransactionType.FIAT_TO_FIAT:
        return "fiatToFiat";
      default:
        return "cryptoToCrypto";
    }
  }

  private getLimitInfo(
    user: any,
    transactionType: TransactionType,
    dailyUsed: number = 0
  ): VelocityCheckResult["limits"] {
    const tierLimits =
      COMPLIANCE_CONFIG.VELOCITY_LIMITS[user.kycTier as KycTier];

    // Get weekly/monthly usage for monitoring (not restriction)
    const usageField = this.getUsageField(transactionType);
    const weeklyUsed = user.weeklyLimitUsed?.[usageField] || 0;
    const monthlyUsed = user.monthlyLimitUsed?.[usageField] || 0;

    return {
      tier: user.kycTier,
      transactionType,
      singleLimit: tierLimits.singleLimit,
      dailyLimit: tierLimits.dailyLimit,
      dailyUsed,
      dailyRemaining: tierLimits.dailyLimit - dailyUsed,
      // Weekly/monthly for monitoring only (shown in UI but don't restrict)
      weeklyLimit: tierLimits.weeklyLimit,
      weeklyUsed,
      weeklyRemaining: tierLimits.weeklyLimit - weeklyUsed,
      monthlyLimit: tierLimits.monthlyLimit,
      monthlyUsed,
      monthlyRemaining: tierLimits.monthlyLimit - monthlyUsed,
      allowedTypes: tierLimits.allowedTransactionTypes,
    };
  }

  async updateLimitUsage(
    userId: string,
    amount: number,
    transactionType: TransactionType
  ): Promise<void> {
    const usageField: any = this.getUsageField(transactionType);

    await User.findByIdAndUpdate(userId, {
      $inc: {
        [`dailyLimitUsed.${usageField}`]: amount,
        [`weeklyLimitUsed.${usageField}`]: amount,
        [`monthlyLimitUsed.${usageField}`]: amount,
        totalDeposits: amount,
      },
      $set: {
        lastDepositDate: new Date(),
      },
      $min: {
        firstDepositDate: new Date(),
      },
    });
  }

  /**
   * Get usage suggestions (not restrictions) for weekly/monthly
   */
  async getUsageSuggestions(userId: string): Promise<{
    daily: {
      used: number;
      limit: number;
      remaining: number;
      percent: number;
      suggestion?: string;
    };
    weekly: {
      used: number;
      limit: number;
      remaining: number;
      percent: number;
      suggestion?: string;
    };
    monthly: {
      used: number;
      limit: number;
      remaining: number;
      percent: number;
      suggestion?: string;
    };
  }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const tierLimits =
      COMPLIANCE_CONFIG.VELOCITY_LIMITS[user.kycTier as KycTier];

    // Calculate total usage across all transaction types
    const dailyUsed = Object.values(user.dailyLimitUsed).reduce(
      (a: number, b: number) => a + b,
      0
    );
    const weeklyUsed = Object.values(user.weeklyLimitUsed).reduce(
      (a: number, b: number) => a + b,
      0
    );
    const monthlyUsed = Object.values(user.monthlyLimitUsed).reduce(
      (a: number, b: number) => a + b,
      0
    );

    const dailyPercent = (dailyUsed / tierLimits.dailyLimit) * 100;
    const weeklyPercent = (weeklyUsed / tierLimits.weeklyLimit) * 100;
    const monthlyPercent = (monthlyUsed / tierLimits.monthlyLimit) * 100;

    // Generate suggestions (not restrictions)
    const getSuggestion = (
      percent: number,
      type: string
    ): string | undefined => {
      if (percent > 90) return `You're approaching your ${type} limit`;
      if (percent > 70) return `Consider spacing out your ${type} transactions`;
      return undefined;
    };

    return {
      daily: {
        used: dailyUsed,
        limit: tierLimits.dailyLimit,
        remaining: tierLimits.dailyLimit - dailyUsed,
        percent: dailyPercent,
        suggestion: getSuggestion(dailyPercent, "daily"),
      },
      weekly: {
        used: weeklyUsed,
        limit: tierLimits.weeklyLimit,
        remaining: tierLimits.weeklyLimit - weeklyUsed,
        percent: weeklyPercent,
        suggestion: getSuggestion(weeklyPercent, "weekly"),
      },
      monthly: {
        used: monthlyUsed,
        limit: tierLimits.monthlyLimit,
        remaining: tierLimits.monthlyLimit - monthlyUsed,
        percent: monthlyPercent,
        suggestion: getSuggestion(monthlyPercent, "monthly"),
      },
    };
  }

  /**
   * Reset daily limits (call this at midnight)
   */
  async resetDailyLimits(): Promise<void> {
    try {
      await User.updateMany(
        {},
        {
          $set: {
            "dailyLimitUsed.fiatToCrypto": 0,
            "dailyLimitUsed.cryptoToFiat": 0,
            "dailyLimitUsed.cryptoToCrypto": 0,
            "dailyLimitUsed.fiatToFiat": 0,
          },
        }
      );
      console.log("Daily limits reset at", new Date().toISOString());
    } catch (error) {
      console.error("Failed to reset daily limits:", error);
    }
  }

  /**
   * Reset weekly limits (call this on Monday 00:00)
   */
  async resetWeeklyLimits(): Promise<void> {
    try {
      await User.updateMany(
        {},
        {
          $set: {
            "weeklyLimitUsed.fiatToCrypto": 0,
            "weeklyLimitUsed.cryptoToFiat": 0,
            "weeklyLimitUsed.cryptoToCrypto": 0,
            "weeklyLimitUsed.fiatToFiat": 0,
          },
        }
      );
      console.log("Weekly limits reset at", new Date().toISOString());
    } catch (error) {
      console.error("Failed to reset weekly limits:", error);
    }
  }

  /**
   * Reset monthly limits (call this on 1st of month 00:00)
   */
  async resetMonthlyLimits(): Promise<void> {
    try {
      await User.updateMany(
        {},
        {
          $set: {
            "monthlyLimitUsed.fiatToCrypto": 0,
            "monthlyLimitUsed.cryptoToFiat": 0,
            "monthlyLimitUsed.cryptoToCrypto": 0,
            "monthlyLimitUsed.fiatToFiat": 0,
          },
        }
      );
      console.log("Monthly limits reset at", new Date().toISOString());
    } catch (error) {
      console.error("Failed to reset monthly limits:", error);
    }
  }
}
