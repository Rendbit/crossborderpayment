import { TransactionType } from "../enums/transaction";
import { KycTier } from "../enums/kyc";

export const COMPLIANCE_CONFIG = {
  // Customer-friendly velocity limits - ONLY DAILY LIMITS RESTRICT
  VELOCITY_LIMITS: {
    [KycTier.NONE]: {
      canUseApp: true,
      singleLimit: 1000, // $1,000 per transaction
      dailyLimit: 5000, // $5,000 daily (ONLY THIS RESTRICTS)
      weeklyLimit: 20000, // $20,000 weekly (MONITORING ONLY)
      monthlyLimit: 50000, // $50,000 monthly (MONITORING ONLY)
      allowedTransactionTypes: [
        TransactionType.CRYPTO_TO_CRYPTO,
      ] as TransactionType[],
      maxDailyTransactions: 10,
    },
    [KycTier.BASIC]: {
      canUseApp: true,
      singleLimit: 5000, // $5,000 per transaction
      dailyLimit: 25000, // $25,000 daily (ONLY THIS RESTRICTS)
      weeklyLimit: 100000, // $100,000 weekly (MONITORING ONLY)
      monthlyLimit: 300000, // $300,000 monthly (MONITORING ONLY)
      allowedTransactionTypes: [
        TransactionType.CRYPTO_TO_CRYPTO,
        TransactionType.FIAT_TO_CRYPTO,
        TransactionType.CRYPTO_TO_FIAT,
      ] as TransactionType[],
      maxDailyTransactions: 20,
    },
    [KycTier.STANDARD]: {
      canUseApp: true,
      singleLimit: 25000, // $25,000 per transaction
      dailyLimit: 100000, // $100,000 daily (ONLY THIS RESTRICTS)
      weeklyLimit: 500000, // $500,000 weekly (MONITORING ONLY)
      monthlyLimit: 1500000, // $1.5M monthly (MONITORING ONLY)
      allowedTransactionTypes: [
        TransactionType.FIAT_TO_CRYPTO,
        TransactionType.FIAT_TO_FIAT,
        TransactionType.CRYPTO_TO_FIAT,
        TransactionType.CRYPTO_TO_CRYPTO,
      ] as TransactionType[],
      maxDailyTransactions: 50,
    },
  },

  // AML Settings
  AML: {
    HIGH_RISK_THRESHOLD: 70,
    MEDIUM_RISK_THRESHOLD: 40,
    LOW_RISK_THRESHOLD: 20,
    PROVIDERS: ["chainalysis", "elliptic", "trmlabs"] as const,
  },

  // Smart Verification Thresholds
  SMART_THRESHOLDS: {
    SOURCE_OF_FUNDS: {
      [KycTier.NONE]: 10000, // $10,000 for Tier 0
      [KycTier.BASIC]: 50000, // $50,000 for Tier 1
      [KycTier.STANDARD]: 200000, // $200,000 for Tier 2
    },
  },
} as const;
