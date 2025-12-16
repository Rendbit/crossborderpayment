import { z } from "zod";

export const CreatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(40, "Password must be at most 40 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character"
      ),
  })
  .strict();

export const UpdateProfileSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be at most 30 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores"
      )
      .optional(),
    country: z
      .string()
      .min(2, "Country must be at least 2 characters")
      .max(50, "Country must be at most 50 characters")
      .regex(/^[a-zA-Z\s]+$/, "Country can only contain letters and spaces")
      .optional(),
  })
  .strict()
  .refine((data) => data.username || data.country, {
    message: "At least one field (username or country) must be provided",
  });

export const UpdateProfileImageSchema = z
  .object({
    userProfileUrl: z
      .string()
      .url("Profile image must be a valid URL")
      .max(500, "Profile image URL is too long"),
  })
  .strict();

export const ChangePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Old password is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(40, "Password must be at most 40 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character"
      ),
  })
  .strict();

export const ExportPrivateKeySchema = z
  .object({
    pinCode: z
      .string()
      .length(4, "Pin code must be exactly 4 digits")
      .regex(/^\d{4}$/, "Pin code must contain only digits"),
  })
  .strict();

export const GetReferralsSchema = z
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
