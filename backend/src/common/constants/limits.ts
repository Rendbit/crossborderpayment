export const TRANSACTION_LIMITS = {
  // Minimum and maximum transaction amounts
  MIN_DEPOSIT_AMOUNT: 10,
  MAX_DEPOSIT_AMOUNT: 100000,
  MIN_WITHDRAWAL_AMOUNT: 10,
  MAX_WITHDRAWAL_AMOUNT: 50000,
  
  // Frequency limits
  MAX_DAILY_TRANSACTIONS: 10,
  MAX_WEEKLY_TRANSACTIONS: 50,
  MAX_MONTHLY_TRANSACTIONS: 200,
  
  // Crypto-specific limits
  MIN_CRYPTO_AMOUNT: 0.001,
  MAX_CRYPTO_AMOUNT: 100
};

export const KYC_LIMITS = {
  // Document upload limits
  MAX_DOCUMENT_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_DOCUMENT_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
  MAX_DOCUMENTS_PER_TYPE: 3,
  
  // Verification time limits
  MAX_VERIFICATION_TIME: 48, // hours
  MAX_RESUBMISSION_ATTEMPTS: 3
};