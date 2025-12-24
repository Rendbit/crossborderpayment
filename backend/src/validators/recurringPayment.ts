import { z } from "zod";
import { TimeFormatConverter } from "../utils/timeFormatConverter";

// Common validators
const AmountSchema = z
  .string()
  .regex(
    /^\d+(\.\d{1,2})?$/,
    "Amount must be a valid number with up to 2 decimal places"
  )
  .refine((val) => parseFloat(val) > 0, "Amount must be greater than 0")
  .transform((val) => parseFloat(val));

const CurrencySchema = z
  .string()
  .min(3, "Currency code must be at least 3 characters")
  .max(10, "Currency code must be at most 10 characters")
  .regex(/^[A-Z]+$/, "Currency code must contain only uppercase letters")
  .default("XLM");

const DescriptionSchema = z
  .string()
  .max(500, "Description must be at most 500 characters")
  .optional();

const StellarAddressSchema = z
  .string()
  .length(56, "Stellar address must be exactly 56 characters")
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

const ToUserSchema = z.union([
  StellarAddressSchema,
  EmailSchema,
  UsernameSchema,
]);

const DateSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), "Invalid date format")
  .transform((val) => new Date(val));

// Date string in YYYY-MM-DD format
const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .transform((val) => TimeFormatConverter.parseDateString(val));

// 12-hour time schema
const Time12HourSchema = z
  .string()
  .regex(
    /^(\d{1,2}):([0-5][0-9])\s*(AM|PM)$/i,
    'Invalid time format. Use "9:00 AM" or "2:30 PM"'
  )
  .refine(
    (time) => {
      const validation = TimeFormatConverter.validate12HourTime(time);
      return validation.valid;
    },
    (time) => {
      const validation = TimeFormatConverter.validate12HourTime(time);
      return { message: validation.error || "Invalid time format" };
    }
  );

// Custom times array validator with auto-sorting
const ScheduleTimesSchema = z
  .array(Time12HourSchema)
  .min(1, "At least one schedule time is required")
  .transform((times, ctx) => {
    // Remove duplicates
    const uniqueTimes = [...new Set(times)];

    // Validate and process
    const result = TimeFormatConverter.processTimeArray(uniqueTimes);

    if (!result.valid) {
      result.errors.forEach((error) => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: error,
        });
      });
      return z.NEVER;
    }

    // Add warnings to context if needed
    if (result.warnings.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Note: ${result.warnings.join("; ")}`,
        fatal: false,
      });
    }

    // Return sorted times in 24-hour format for backend
    return result.sortedTimes24h;
  })
  .optional();

// Custom datetimes array validator
const CustomDatetimesSchema = z
  .array(
    z.object({
      date: DateStringSchema,
      time: Time12HourSchema,
    })
  )
  .min(1, "At least one datetime is required for custom frequency")
  .transform((datetimes, ctx) => {
    // Convert to ISO strings
    const isoDates = datetimes.map((dt: any) => {
      return TimeFormatConverter.createDateTimeISO(dt.date, dt.time);
    });

    // Sort chronologically
    const sortedIsoDates = [...isoDates].sort();

    // Check if dates are in chronological order
    const datesAreChronological =
      JSON.stringify(isoDates) === JSON.stringify(sortedIsoDates);

    if (!datesAreChronological) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Datetimes must be in chronological order. They will be automatically sorted.",
        fatal: false,
      });
    }

    // Check for duplicate datetimes
    const uniqueIsoDates = [...new Set(sortedIsoDates)];
    if (uniqueIsoDates.length !== sortedIsoDates.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate datetimes were removed",
        fatal: false,
      });
    }

    return uniqueIsoDates;
  })
  .optional();

// Specific hours for hourly frequency
const SpecificHoursSchema = z
  .array(Time12HourSchema)
  .transform((times, ctx) => {
    const result = TimeFormatConverter.processTimeArray(times);

    if (!result.valid) {
      result.errors.forEach((error) => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: error,
        });
      });
      return z.NEVER;
    }

    // Convert to hours array (0-23) for backend
    const hours = result.sortedTimes24h.map((time24h) => {
      return parseInt(time24h.split(":")[0]);
    });

    return hours;
  })
  .optional();

// Schedule window schema
const ScheduleWindowSchema = z
  .object({
    startHour: z.number().int().min(0).max(23).default(0),
    endHour: z.number().int().min(0).max(23).default(23),
    timezone: z.string().default("UTC"),
  })
  .refine(
    (data) => data.startHour < data.endHour,
    "startHour must be less than endHour"
  )
  .optional();

// Recurring payment metadata schema
export const RecurringPaymentMetadataSchema = z
  .object({
    // Schedule times for Daily, Weekly, Monthly, Yearly frequencies
    scheduleTimes: ScheduleTimesSchema,

    // For Hourly frequency
    hourlyInterval: z.number().int().min(1).max(24).optional(),
    specificHours: SpecificHoursSchema,

    // For Custom frequency
    customDatetimes: CustomDatetimesSchema,

    // Schedule window
    scheduleWindow: ScheduleWindowSchema,

    // Timezone
    timezone: z.string().optional().default("UTC"),

    // Exclusions
    skipWeekends: z.boolean().default(false),
    excludedDays: z.array(z.number().int().min(0).max(6)).default([0, 6]),
    excludedHours: z.array(z.number().int().min(0).max(23)).default([]),
    excludedDates: z.array(DateSchema).default([]),

    // Pause settings
    pauseEnabled: z.boolean().default(false),
    pauseStartDate: z.union([DateSchema, z.null()]).optional(),
    pauseEndDate: z.union([DateSchema, z.null()]).optional(),
    pauseReason: z
      .union([
        z.string().max(500, "Pause reason must be at most 500 characters"),
        z.null(),
      ])
      .optional(),

    // For backward compatibility with custom frequency
    customInterval: z.number().int().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    // Validate that scheduleTimes are provided for frequencies that need them
    // This will be validated in the main schema
    return true;
  })
  .refine(
    (data) => {
      if (data.pauseEnabled) {
        if (
          data.pauseStartDate === null ||
          data.pauseStartDate === undefined ||
          data.pauseEndDate === null ||
          data.pauseEndDate === undefined
        ) {
          return false;
        }
        return data.pauseStartDate < data.pauseEndDate;
      }
      return true;
    },
    {
      message:
        "pauseStartDate and pauseEndDate are required when pauseEnabled is true, and pauseEndDate must be after pauseStartDate",
      path: ["pauseEndDate"],
    }
  )
  .optional();

// Create recurring payment schema
export const CreateRecurringPaymentSchema = z
  .object({
    amount: AmountSchema,
    currency: CurrencySchema,
    description: DescriptionSchema,
    frequency: z.enum([
      "hourly",
      "daily",
      "weekly",
      "bi_weekly",
      "monthly",
      "quarterly",
      "yearly",
      "custom",
    ]),
    startDate: DateSchema.refine(
      (date) => date >= new Date(),
      "Start date cannot be in the past"
    ),
    endDate: DateSchema.optional(),
    toUser: ToUserSchema,
    paymentMethod: z.enum(["crypto", "fiat", "both"]).default("both"),
    pinCode: PinCodeSchema,
    metadata: RecurringPaymentMetadataSchema,
  })
  .refine(
    (data) => {
      if (data.endDate) {
        return data.endDate > data.startDate;
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => {
      // Validate frequency-specific requirements
      switch (data.frequency) {
        case "custom":
          return (
            !!data.metadata?.customDatetimes &&
            data.metadata.customDatetimes.length > 0
          );

        case "daily":
        case "weekly":
        case "bi_weekly":
        case "monthly":
        case "quarterly":
        case "yearly":
          return (
            !!data.metadata?.scheduleTimes &&
            data.metadata.scheduleTimes.length > 0
          );

        case "hourly":
          // Either hourlyInterval or specificHours is required
          return !!(
            data.metadata?.hourlyInterval ||
            (data.metadata?.specificHours &&
              data.metadata.specificHours.length > 0)
          );

        default:
          return true;
      }
    },
    (data) => {
      let message = "";
      switch (data.frequency) {
        case "custom":
          message = "customDatetimes is required for custom frequency";
          break;
        case "daily":
        case "weekly":
        case "bi_weekly":
        case "monthly":
        case "quarterly":
        case "yearly":
          message = "scheduleTimes is required for this frequency";
          break;
        case "hourly":
          message =
            "hourlyInterval or specificHours is required for hourly frequency";
          break;
      }
      return { message, path: ["metadata"] };
    }
  )
  .refine(
    (data) => {
      // Validate hourly/custom frequency requires scheduleWindow
      if (
        (data.frequency === "hourly" || data.frequency === "custom") &&
        data.metadata?.scheduleWindow
      ) {
        const { startHour, endHour } = data.metadata.scheduleWindow;
        return startHour < endHour;
      }
      return true;
    },
    {
      message: "startHour must be less than endHour for hourly/custom payments",
      path: ["metadata.scheduleWindow"],
    }
  );

// Edit recurring payment schema
export const EditRecurringPaymentSchema = z
  .object({
    scheduleId: z.string().min(1, "Schedule ID is required").max(100),
    amount: AmountSchema.optional(),
    currency: CurrencySchema.optional(),
    description: DescriptionSchema,
    frequency: z
      .enum([
        "hourly",
        "daily",
        "weekly",
        "bi_weekly",
        "monthly",
        "quarterly",
        "yearly",
        "custom",
      ])
      .optional(),
    endDate: DateSchema.optional(),
    metadata: RecurringPaymentMetadataSchema,
    pinCode: PinCodeSchema,
  })
  .refine(
    (data) => {
      // Ensure at least one field is being updated (excluding scheduleId and pinCode)
      const { scheduleId, pinCode, ...updateFields } = data;
      return Object.keys(updateFields).length > 0;
    },
    {
      message: "At least one field must be provided for update",
    }
  )
  .refine(
    (data) => {
      // Validate pause dates if pause is being enabled
      if (data.metadata?.pauseEnabled === true) {
        if (!data.metadata.pauseStartDate || !data.metadata.pauseEndDate) {
          return false;
        }
        return data.metadata.pauseStartDate < data.metadata.pauseEndDate;
      }
      return true;
    },
    {
      message:
        "pauseStartDate and pauseEndDate are required when enabling pause, and pauseEndDate must be after pauseStartDate",
      path: ["metadata.pauseEndDate"],
    }
  );

// Get recurring payment schema
export const GetRecurringPaymentSchema = z
  .object({
    scheduleId: z.string().min(1, "Schedule ID is required").max(100),
  })
  .strict();

// Cancel recurring payment schema
export const CancelRecurringPaymentSchema = z
  .object({
    scheduleId: z.string().min(1, "Schedule ID is required").max(100),
    pinCode: PinCodeSchema.optional(),
    reason: z
      .string()
      .min(1, "Reason is required")
      .max(200, "Reason must be at most 200 characters")
      .optional(),
  })
  .strict();

// List recurring payments schema
export const ListRecurringPaymentsSchema = z
  .object({
    page: z
      .string()
      .regex(/^\d+$/, "Page must be a number")
      .transform((val) => parseInt(val, 10))
      .refine((val) => val > 0, "Page must be greater than 0")
      .default("1"),
    limit: z
      .string()
      .regex(/^\d+$/, "Limit must be a number")
      .transform((val) => parseInt(val, 10))
      .refine((val) => val > 0 && val <= 100, "Limit must be between 1 and 100")
      .default("10"),
    status: z.enum(["active", "paused", "cancelled", "completed"]).optional(),
    direction: z.enum(["sent", "received", "all"]).optional(),
  })
  .strict();
