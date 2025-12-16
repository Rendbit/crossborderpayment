import { z } from "zod";

export const SetupMFASchema = z
  .object({
    code: z
      .string()
      .min(6, "Code must be exactly 6 digits")
      .max(6, "Code must be exactly 6 digits")
      .regex(/^\d{6}$/, "Code must be a 6-digit number"),
  })
  .strict();

export const VerifyOTPSchema = z
  .object({
    code: z
      .string()
      .min(6, "Code must be exactly 6 digits")
      .max(6, "Code must be exactly 6 digits")
      .regex(/^\d{6}$/, "Code must be a 6-digit number"),
  })
  .strict();
