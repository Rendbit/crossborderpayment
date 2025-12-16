import { z } from "zod";

// Common validators
const AssetCodeSchema = z
  .string()
  .min(1, "Asset code is required")
  .max(12, "Asset code must be at most 12 characters")
  .regex(/^[A-Z]+$/, "Asset code must contain only uppercase letters");

const StellarAddressSchema = z
  .string()
  .min(56, "Invalid Stellar address")
  .max(56, "Invalid Stellar address")
  .regex(/^G[A-Z0-9]{55}$/, "Invalid Stellar address format");

const AmountSchema = z
  .string()
  .regex(/^\d+(\.\d+)?$/, "Amount must be a valid number")
  .refine((val) => parseFloat(val) > 0, "Amount must be greater than 0");

const PinCodeSchema = z
  .string()
  .length(4, "Pin code must be exactly 4 digits")
  .regex(/^\d{4}$/, "Pin code must contain only digits");

// Trustline validators
export const AddTrustlineSchema = z
  .object({
    assetCode: AssetCodeSchema,
  })
  .strict();

export const RemoveTrustlineSchema = z
  .object({
    assetCode: AssetCodeSchema,
  })
  .strict();

// Payment validators
export const PaymentPreviewSchema = z
  .object({
    assetCode: AssetCodeSchema.or(z.literal("NATIVE")),
    address: StellarAddressSchema,
    amount: AmountSchema,
    transactionDetails: z
      .string()
      .max(500, "Transaction details too long")
      .optional(),
    currencyType: z.enum(["CRYPTO", "FIAT"]).optional(),
    accountNumber: z.string().max(50, "Account number too long").optional(),
    accountName: z.string().max(100, "Account name too long").optional(),
    bankName: z.string().max(100, "Bank name too long").optional(),
  })
  .strict();

export const PaymentSchema = PaymentPreviewSchema.extend({
  pinCode: PinCodeSchema,
}).strict();

// Swap validators
export const SwapPreviewSchema = z
  .object({
    slippage: z
      .number()
      .min(0, "Slippage must be at least 0%")
      .max(100, "Slippage must be at most 100%"),
    sourceAssetCode: AssetCodeSchema.or(z.literal("NATIVE")),
    desAssetCode: AssetCodeSchema.or(z.literal("NATIVE")),
    sourceAmount: AmountSchema,
  })
  .strict();

export const SwapSchema = SwapPreviewSchema.extend({
  pinCode: PinCodeSchema,
}).strict();

// Strict Send validators
export const StrictSendPreviewSchema = z
  .object({
    desAddress: StellarAddressSchema,
    slippage: z
      .number()
      .min(0, "Slippage must be at least 0%")
      .max(100, "Slippage must be at most 100%"),
    assetCode: AssetCodeSchema.or(z.literal("NATIVE")),
    amount: AmountSchema,
    desAmount: AmountSchema.optional(),
  })
  .strict();

export const StrictSendSchema = StrictSendPreviewSchema.extend({
  pinCode: PinCodeSchema,
}).strict();

// Strict Receive validators
export const StrictReceivePreviewSchema = z
  .object({
    desAddress: StellarAddressSchema,
    slippage: z
      .number()
      .min(0, "Slippage must be at least 0%")
      .max(100, "Slippage must be at most 100%"),
    sourceAssetCode: AssetCodeSchema.or(z.literal("NATIVE")),
    desAssetCode: AssetCodeSchema.or(z.literal("NATIVE")),
    desAmount: AmountSchema,
  })
  .strict();

export const StrictReceiveSchema = StrictReceivePreviewSchema.extend({
  pinCode: PinCodeSchema,
}).strict();

// Transaction history validators
export const GetTransactionsSchema = z
  .object({
    cursor: z.string().optional(),
    limit: z
      .string()
      .regex(/^\d+$/, "Limit must be a number")
      .transform((val) => parseInt(val, 10))
      .refine((val) => val > 0 && val <= 100, "Limit must be between 1 and 100")
      .optional()
      .default("10"),
    order: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .strict();

export const GetFiatTransactionsSchema = z
  .object({
    page: z
      .string()
      .regex(/^\d+$/, "Page must be a number")
      .transform((val) => parseInt(val, 10))
      .refine((val) => val > 0, "Page must be greater than 0")
      .optional()
      .default("1"),
    limit: z
      .string()
      .regex(/^\d+$/, "Limit must be a number")
      .transform((val) => parseInt(val, 10))
      .refine((val) => val > 0 && val <= 100, "Limit must be between 1 and 100")
      .optional()
      .default("10"),
  })
  .strict();
