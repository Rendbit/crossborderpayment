export const KYC_MESSAGES = {
  0: "Complete email verification to start using RendBit. Basic features available with small deposit limits.",
  1: "Basic KYC completed. You can deposit and exchange up to $5,000 daily. Make 3 deposits over $2,000 to unlock Tier 2.",
  2: "Full KYC completed. Enjoy maximum limits: $50,000 daily, $10,000 per transaction. Full platform access granted.",
};

export const TRANSACTION_MESSAGES = {
  TIER_UPGRADED:
    "Congratulations! You have been upgraded to Tier 2 based on your deposit pattern.",
  SOURCE_OF_FUNDS_REQUIRED:
    "Your deposit exceeds $2,000. Please provide source of funds information.",
  LIMIT_EXCEEDED: (type: string, limit: number) =>
    `${type} limit exceeded. Maximum allowed: $${limit}`,
  AML_FLAGGED:
    "Transaction flagged for review. Our compliance team will contact you.",
  AML_MEDIUM_RISK:
    "Transaction processed. Additional verification may be required.",
  AML_LOW_RISK: "Transaction processed successfully.",
};

export const COMPLIANCE_MESSAGES = {
  ACCOUNT_FLAGGED: "Your account has been flagged for compliance review.",
  VERIFICATION_REQUIRED: "Additional verification required to continue.",
  UNDER_REVIEW:
    "Your account is under review. Please contact support for more information.",
};
