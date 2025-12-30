import { z } from "zod";

// Email validator
export const EmailSchema = z
  .string()
  .email("Invalid email format")
  .min(5, "Email must be at least 5 characters")
  .max(100, "Email must be at most 100 characters")
  .transform((val) => val.toLowerCase().trim());

// Password validator with security requirements
export const PasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(40, "Password must be at most 40 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[\W_]/, "Password must contain at least one special character");

// PIN code validator
export const PinCodeSchema = z
  .string()
  .length(4, "PIN code must be exactly 4 digits")
  .regex(/^\d{4}$/, "PIN code must contain only digits");

// Username validator
export const UsernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Username can only contain letters, numbers, and underscores"
  );

// Country code validator (ISO 3166-1 alpha-2)
export const CountrySchema = z
  .string()

// OTP validator
export const OTPSchema = z
  .string()
  .length(4, "OTP must be exactly 4 digits")
  .regex(/^\d{4}$/, "OTP must contain only digits");

// Public key validator (Stellar)
export const PublicKeySchema = z
  .string()
  .length(56, "Public key must be 56 characters")
  .regex(/^G[A-Z0-9]{55}$/, "Invalid public key format");

// Create wallet validator
export const CreateWalletSchema = z
  .object({
    pinCode: PinCodeSchema,
    username: UsernameSchema,
    country: CountrySchema,
  })
  .strict();

// Friendbot validator
export const FriendbotSchema = z
  .object({
    publicKey: PublicKeySchema,
  })
  .strict();

// Fund account preview validator
export const FundAccountPreviewSchema = z
  .object({
    destination: PublicKeySchema,
  })
  .strict();

// Fund account validator
export const FundAccountSchema = z
  .object({
    destination: PublicKeySchema,
    amount: z
      .string()
      .regex(/^\d+(\.\d+)?$/, "Amount must be a valid number")
      .refine((val) => parseFloat(val) > 0, "Amount must be greater than 0"),
    key: z.string().min(1, "Key is required"),
  })
  .strict();

// Login validator
export const LoginSchema = z
  .object({
    email: EmailSchema,
    password: PasswordSchema,
    code: z
      .string()
      .length(6, "MFA code must be 6 digits")
      .optional()
      .or(z.literal("")),
    captcha: z.string().optional(),
  })
  .strict();

// Email validation request validator
export const EmailValidationSchema = z
  .object({
    email: EmailSchema,
  })
  .strict();

// Register validator
export const RegisterSchema = z
  .object({
    email: EmailSchema,
    password: PasswordSchema,
    referralCode: z
      .string()
      .min(5, "Referral code must be at least 5 characters")
      .max(20, "Referral code must be at most 20 characters")
      .optional()
      .or(z.literal("")),
    captcha: z.string().optional(),
  })
  .strict();

// Forgot password validator
export const ForgotPasswordSchema = z
  .object({
    email: EmailSchema,
  })
  .strict();

// Resend OTP validator
export const ResendOTPSchema = z
  .object({
    email: EmailSchema,
  })
  .strict();

// Verify email validator
export const VerifyEmailSchema = z
  .object({
    otp: OTPSchema,
  })
  .strict();

// Reset password validator
export const ResetPasswordSchema = z
  .object({
    email: EmailSchema,
    otp: OTPSchema,
    password: PasswordSchema,
  })
  .strict();

// Validate user validator (for social login)
export const ValidateUserSchema = z
  .object({
    email: EmailSchema,
    userProfileUrl: z
      .string()
      .url("Invalid profile URL")
      .optional()
      .or(z.literal("")),
    isEmailVerified: z.boolean().optional(),
  })
  .strict();

export const VerifyUserSchema = z
  .object({
    email: EmailSchema,
  })
  .strict();
