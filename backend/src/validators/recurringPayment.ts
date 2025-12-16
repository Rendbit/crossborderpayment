import { z } from "zod";

// Common validators
const AmountSchema = z
  .string()
  .regex(/^\d+(\.\d+)?$/, "Amount must be a valid number")
  .refine((val) => parseFloat(val) > 0, "Amount must be greater than 0");

const CurrencySchema = z
  .string()
  .min(3, "Currency code must be at least 3 characters")
  .max(10, "Currency code must be at most 10 characters")
  .regex(/^[A-Z]+$/, "Currency code must contain only uppercase letters");

const DescriptionSchema = z
  .string()
  .max(500, "Description must be at most 500 characters")
  .optional();

const StellarAddressSchema = z
  .string()
  .min(56, "Invalid Stellar address")
  .max(56, "Invalid Stellar address")
  .regex(/^G[A-Z0-9]{55}$/, "Invalid Stellar address format");

const EmailSchema = z
  .string()
  .email("Invalid email format")
  .min(5, "Email must be at least 5 characters")
  .max(100, "Email must be at most 100 characters")
  .transform((val) => val.toLowerCase().trim());

const UsernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Username can only contain letters, numbers, and underscores"
  );

const PinCodeSchema = z
  .string()
  .length(4, "PIN code must be exactly 4 digits")
  .regex(/^\d{4}$/, "PIN code must contain only digits");

export const CreateRecurringPaymentSchema = z
  .object({
    amount: AmountSchema,
    currency: CurrencySchema,
    description: DescriptionSchema,
    frequency: z.enum([
      "daily",
      "weekly",
      "bi_weekly",
      "monthly",
      "quarterly",
      "yearly",
    ]),
    startDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), "Invalid start date")
      .transform((val) => new Date(val)),
    endDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), "Invalid end date")
      .transform((val) => new Date(val))
      .optional(),
    toUser: z.union([StellarAddressSchema, EmailSchema, UsernameSchema]),
    paymentMethod: z
      .enum(["crypto", "fiat", "both"])
      .optional()
      .default("both"),
    pinCode: PinCodeSchema,
    metadata: z.record(z.any()).optional(),
  })
  .strict()
  .refine(
    (data) => {
      // Ensure endDate is after startDate if provided
      if (data.endDate && data.endDate <= data.startDate) {
        return false;
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["endDate"],
    }
  );

export const GetRecurringPaymentSchema = z
  .object({
    scheduleId: z
      .string()
      .min(1, "Schedule ID is required")
      .max(100, "Schedule ID must be at most 100 characters"),
  })
  .strict();

export const CancelRecurringPaymentSchema = z
  .object({
    scheduleId: z
      .string()
      .min(1, "Schedule ID is required")
      .max(100, "Schedule ID must be at most 100 characters"),
    reason: z
      .string()
      .min(1, "Reason is required")
      .max(200, "Reason must be at most 200 characters")
      .optional(),
  })
  .strict();

export const ListRecurringPaymentsSchema = z
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
    status: z.enum(["active", "paused", "cancelled", "completed"]).optional(),
    direction: z.enum(["sent", "received", "all"]).optional(),
  })
  .strict();
