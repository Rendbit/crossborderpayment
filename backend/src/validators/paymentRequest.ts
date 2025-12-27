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

// Metadata schemas
const PaymentRequestMetadataSchema = z.object({
  invoiceNumber: z
    .string()
    .min(1, "Invoice number is required")
    .max(100, "Invoice number must be at most 100 characters"),
  invoiceDateAndTime: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), "Invalid invoice date and time")
    .transform((val) => new Date(val)),
});

// Payment request validators
export const CreatePaymentRequestSchema = z
  .object({
    amount: AmountSchema,
    currency: CurrencySchema,
    description: DescriptionSchema,
    expiresIn: z
      .string()
      .regex(/^\d+$/, "Expires in must be a number")
      .transform((val) => parseInt(val, 10))
      .refine(
        (val) => val >= 1 && val <= 30,
        "Expires in must be between 1 and 30 days"
      )
      .optional()
      .default("7"),
    toUser: z.union([StellarAddressSchema, EmailSchema, UsernameSchema]),
    paymentMethod: z
      .enum(["crypto", "fiat", "both"])
      .optional()
      .default("both")
  })
  .strict();

export const EditPaymentRequestSchema = z
  .object({
    requestId: z
      .string()
      .min(1, "Request ID is required")
      .max(100, "Request ID must be at most 100 characters"),
    amount: AmountSchema.optional(),
    currency: CurrencySchema.optional(),
    description: DescriptionSchema,
    expiresIn: z
      .string()
      .regex(/^\d+$/, "Expires in must be a number")
      .transform((val) => parseInt(val, 10))
      .refine(
        (val) => val >= 1 && val <= 30,
        "Expires in must be between 1 and 30 days"
      )
      .optional(),
    metadata: PaymentRequestMetadataSchema.partial().optional(),
  })
  .strict()
  .refine(
    (data) => {
      // Ensure at least one field is being updated
      const { requestId, ...updateFields } = data;
      return Object.keys(updateFields).length > 0;
    },
    {
      message: "At least one field must be provided for update",
    }
  );

export const GetPaymentRequestSchema = z
  .object({
    requestId: z
      .string()
      .min(1, "Request ID is required")
      .max(100, "Request ID must be at most 100 characters"),
  })
  .strict();

export const ProcessPaymentRequestSchema = z
  .object({
    requestId: z
      .string()
      .min(1, "Request ID is required")
      .max(100, "Request ID must be at most 100 characters"),
    paymentMethod: z.enum(["crypto", "fiat"]),
    pinCode: PinCodeSchema,
    transactionDetails: z
      .string()
      .max(500, "Transaction details too long")
      .optional(),
  })
  .strict();

export const CancelPaymentRequestSchema = z
  .object({
    requestId: z
      .string()
      .min(1, "Request ID is required")
      .max(100, "Request ID must be at most 100 characters"),
    reason: z
      .string()
      .min(1, "Reason is required")
      .max(200, "Reason must be at most 200 characters")
      .optional(),
  })
  .strict();

// QR code and link validators
export const GenerateQRCodeSchema = z
  .object({
    requestId: z
      .string()
      .min(1, "Request ID is required")
      .max(100, "Request ID must be at most 100 characters"),
    size: z
      .string()
      .regex(/^\d+$/, "Size must be a number")
      .transform((val) => parseInt(val, 10))
      .refine(
        (val) => val >= 100 && val <= 1000,
        "Size must be between 100 and 1000 pixels"
      )
      .optional()
      .default("300"),
  })
  .strict();

export const ValidatePaymentLinkSchema = z
  .object({
    linkId: z
      .string()
      .min(1, "Link ID is required")
      .max(100, "Link ID must be at most 100 characters"),
  })
  .strict();

// List validators
export const ListPaymentRequestsSchema = z
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
    status: z
      .enum([
        "pending",
        "processing",
        "completed",
        "cancelled",
        "expired",
        "failed",
      ])
      .optional(),
    direction: z.enum(["sent", "received", "all"]).optional(),
  })
  .strict();
