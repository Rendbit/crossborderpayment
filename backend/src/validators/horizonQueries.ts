// validators/horizon.validator.ts
import { z } from "zod";

// Asset code validator
const AssetCodeSchema = z
  .string()
  .min(1, "Asset code is required")
  .max(12, "Asset code must be at most 12 characters")
  .regex(/^[A-Z]+$/, "Asset code must contain only uppercase letters")
  .optional();

// Currency type validator
export const CurrencyTypeSchema = z
  .string()
  .min(1, "Currency type is required")
  .max(5, "Currency type must be at most 5 characters")
  .transform((val) => val.toUpperCase())
  .refine(
    (val) => ["NGN", "GHS", "KES", "NATIVE"].includes(val),
    {
      message: "Currency type must be NGN, GHS, KES, or NATIVE",
    }
  );

// Amount validator
const AmountSchema = z
  .string()
  .regex(/^\d+(\.\d+)?$/, "Amount must be a valid number")
  .refine((val) => parseFloat(val) > 0, "Amount must be greater than 0");

// Transaction type validator
const TransactionTypeSchema = z.enum(["deposit", "withdrawal", "swap"], {
  errorMap: () => ({
    message: "Transaction type must be deposit, withdrawal, or swap",
  }),
});

// Pagination validator
const PaginationSchema = z
  .object({
    limit: z
      .string()
      .regex(/^\d+$/, "Limit must be a number")
      .transform((val) => parseInt(val, 10))
      .refine((val) => val > 0 && val <= 100, "Limit must be between 1 and 100")
      .optional()
      .default("10"),
    page: z
      .string()
      .regex(/^\d+$/, "Page must be a number")
      .transform((val) => parseInt(val, 10))
      .refine((val) => val > 0, "Page must be greater than 0")
      .optional()
      .default("1"),
  })
  .strict();

// Get all wallet assets validator
export const GetAllWalletAssetsSchema = z
  .object({
    currencyType: CurrencyTypeSchema.optional().default("USD"),
  })
  .strict();

// Get path validator
export const GetPathSchema = z
  .object({
    txType: TransactionTypeSchema,
    sourceAssetCode: AssetCodeSchema.or(z.literal("NATIVE")),
    desAssetCode: AssetCodeSchema.or(z.literal("NATIVE")),
    amount: AmountSchema,
  })
  .strict();

// Fetch assets validator
export const FetchAssetsSchema = z
  .object({
    assetCode: AssetCodeSchema.or(z.literal("NATIVE")),
  })
  .strict();

export const FetchAssetsQuerySchema = PaginationSchema;

// Get conversion rates validator
export const GetConversionRatesSchema = z
  .object({
    inputAmount: AmountSchema,
    inputSymbol: z
      .string()
      .min(1, "Input symbol is required")
      .max(10, "Input symbol must be at most 10 characters")
      .transform((val) => val.toUpperCase()),
    outputSymbol: z
      .string()
      .min(1, "Output symbol is required")
      .max(10, "Output symbol must be at most 10 characters")
      .transform((val) => val.toUpperCase()),
  })
  .strict();

// Fetch user details validator
export const FetchUserDetailsSchema = z
  .object({
    searchType: z.enum(["username", "primaryEmail", "rendbitId"], {
      errorMap: () => ({
        message: "Search type must be username, primaryEmail, or rendbitId",
      }),
    }),
    input: z
      .string()
      .min(1, "Input is required")
      .max(100, "Input must be at most 100 characters"),
  })
  .strict();
