import { z } from 'zod';

// Asset code validator
const AssetCodeSchema = z.string()
  .min(1, 'Asset code is required')
  .max(12, 'Asset code must be at most 12 characters')
  .regex(/^[A-Z]+$/, 'Asset code must contain only uppercase letters');

// Stellar public key validator
const StellarPublicKeySchema = z.string()
  .min(56, 'Invalid Stellar public key')
  .max(56, 'Invalid Stellar public key')
  .regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar public key format');

// Transaction type validator
const TransactionTypeSchema = z.enum(['deposit', 'withdrawal'], {
  errorMap: () => ({ message: 'Transaction type must be either "deposit" or "withdrawal"' })
});

// Initiate transfer params validator
export const InitiateTransfer24ParamsSchema = z.object({
  txType: TransactionTypeSchema,
}).strict();

// Initiate transfer body validator
export const InitiateTransfer24Schema = z.object({
  assetCode: AssetCodeSchema,
  stellarPublicKey: StellarPublicKeySchema,
  amount: z.string()
    .regex(/^\d+(\.\d+)?$/, 'Amount must be a valid number')
    .refine(val => parseFloat(val) > 0, 'Amount must be greater than 0')
    .optional(),
  destination: z.string().max(256, 'Destination too long').optional(),
  memo: z.string().max(64, 'Memo too long').optional(),
  memoType: z.string().max(64, 'Memo type too long').optional(),
  lang: z.string().length(2, 'Language must be 2 characters').optional(),
  claimableBalanceSupported: z.boolean().optional(),
}).strict();

// Query transfers validator
export const QueryTransfers24Schema = z.object({
  assetCode: AssetCodeSchema.optional(),
  noOlderThan: z.string()
    .regex(/^\d+$/, 'Invalid timestamp format')
    .optional(),
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100')
    .optional()
    .default('10'),
  kind: z.enum(['deposit', 'withdrawal']).optional(),
  pagingId: z.string().optional(),
}).strict();