import { Request } from "express";
import { RecurringPayment } from "../models/RecurringPayment";
import { ServiceResponse } from "../types/response";
import { User } from "../models/User";
import { emitEvent } from "../microservices/rabbitmq";
import { PinHelper } from "../helpers/pin.helper";
import httpStatus from "http-status";
import QRCode from "qrcode";
import { nanoid } from "nanoid";
import {
  sanitizeInput,
  isValidObjectId,
  isValidPublicKey,
  validatePaymentAmount,
  sanitizeMetadata,
  preventSelfPayment,
  logSecurityEvent,
  validateEmail,
  validateDateRange,
} from "../utils/security";
import {
  CreateRecurringPaymentSchema,
  GetRecurringPaymentSchema,
  CancelRecurringPaymentSchema,
  ListRecurringPaymentsSchema,
  EditRecurringPaymentSchema,
} from "../validators/recurringPayment";
import { BlockchainFactory } from "../providers/blockchainFactory";
import { batchPaymentProcessor } from "./batchPaymentProcessor";
import { Request as ExpressRequest } from "express";
import mongoose, { Document, Types } from "mongoose";

export interface IRecurringPaymentService {
  createRecurringPayment(
    req: ExpressRequest
  ): Promise<ServiceResponse<RecurringPaymentData>>;
  editRecurringPayment(
    req: ExpressRequest
  ): Promise<ServiceResponse<RecurringPaymentData>>;
  getRecurringPayment(
    req: ExpressRequest
  ): Promise<ServiceResponse<RecurringPaymentDetails>>;
  listRecurringPayments(
    req: ExpressRequest
  ): Promise<ServiceResponse<RecurringPaymentsList>>;
  cancelRecurringPayment(
    req: ExpressRequest
  ): Promise<ServiceResponse<CancelRecurringData>>;
  processRecurringPayment(
    req: ExpressRequest
  ): Promise<ServiceResponse<RecurringProcessData>>;
  getProcessingStats(req: ExpressRequest): Promise<ServiceResponse<any>>;
}

export enum RecurringFrequency {
  HOURLY = "hourly",
  DAILY = "daily",
  WEEKLY = "weekly",
  BI_WEEKLY = "bi_weekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  YEARLY = "yearly",
  CUSTOM = "custom",
}

// Define a proper type for payment status
export type RecurringPaymentStatus =
  | "active"
  | "paused"
  | "cancelled"
  | "completed";

export interface RecurringPaymentData {
  recurringPayment: {
    id: string;
    scheduleId: string;
    fromUser: any;
    toUser: any;
    amount: number;
    currency: string;
    description?: string;
    frequency: RecurringFrequency;
    startDate: Date;
    endDate?: Date;
    nextPaymentDate: Date;
    status: RecurringPaymentStatus;
    metadata?: any;
    pinVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface RecurringPaymentDetails {
  recurringPayment: {
    id: string;
    scheduleId: string;
    fromUser: PaymentRequestUser;
    toUser: PaymentRequestUser;
    amount: number;
    currency: string;
    description?: string;
    frequency: RecurringFrequency;
    startDate: Date;
    endDate?: Date;
    nextPaymentDate: Date;
    status: RecurringPaymentStatus;
    metadata?: any;
    paymentMethod: PaymentMethod;
    pinVerified: boolean;
    blockchainTxHashes: string[];
    fiatPaymentRefs: string[];
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface RecurringPaymentsList {
  recurringPayments: Array<{
    id: string;
    scheduleId: string;
    fromUser: PaymentRequestUser;
    toUser: PaymentRequestUser;
    amount: number;
    currency: string;
    description?: string;
    frequency: RecurringFrequency;
    status: RecurringPaymentStatus;
    nextPaymentDate: Date;
    startDate: Date;
    endDate?: Date;
    pinVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CancelRecurringData {
  success: boolean;
}

export interface RecurringProcessData {
  blockchainTxHash?: string;
  fiatPaymentRef?: string;
  recurringPayment: {
    id: string;
    scheduleId: string;
    status: RecurringPaymentStatus;
    amount: number;
    currency: string;
    nextPaymentDate: Date;
    pinVerified: boolean;
  };
  nextPaymentDate?: Date;
}

// User interface for type safety
export interface PaymentRequestUser {
  _id: string | Types.ObjectId;
  username: string;
  primaryEmail: string;
  userProfileUrl?: string;
  stellarPublicKey?: string;
}

export enum PaymentMethod {
  CRYPTO = "crypto",
  FIAT = "fiat",
  BOTH = "both",
}

// Document interface
export interface IRecurringPayment extends Document {
  scheduleId: string;
  fromUser: any;
  toUser: any;
  amount: number;
  currency: string;
  description?: string;
  frequency: RecurringFrequency;
  startDate: Date;
  endDate?: Date;
  nextPaymentDate: Date;
  status: RecurringPaymentStatus;
  paymentMethod: PaymentMethod;
  metadata: Record<string, any>;
  pinVerified: boolean;
  lastProcessedAt?: Date;
  blockchainTxHashes: string[];
  fiatPaymentRefs: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class RecurringPaymentService implements IRecurringPaymentService {
  private readonly BASE_URL =
    process.env.CLIENT_URL || "https://app.rendbit.com";

  // NEW: Helper method to check if payment is paused
  private checkIfPaused(recurringPayment: any): {
    isPaused: boolean;
    reason?: string;
  } {
    // Check if payment status is explicitly paused
    if (recurringPayment.status === "paused") {
      return { isPaused: true, reason: "Payment status is paused" };
    }

    // Check pause metadata
    if (recurringPayment.metadata?.pauseEnabled) {
      const now = new Date();
      const pauseStart = recurringPayment.metadata.pauseStartDate
        ? new Date(recurringPayment.metadata.pauseStartDate)
        : null;
      const pauseEnd = recurringPayment.metadata.pauseEndDate
        ? new Date(recurringPayment.metadata.pauseEndDate)
        : null;

      if (pauseStart && pauseEnd && now >= pauseStart && now <= pauseEnd) {
        return {
          isPaused: true,
          reason:
            recurringPayment.metadata.pauseReason ||
            `Paused from ${pauseStart.toISOString()} to ${pauseEnd.toISOString()}`,
        };
      }

      // If pause period has ended, disable pause
      if (pauseEnd && now > pauseEnd) {
        // This will be handled in the batch processor, but we note it here
        return {
          isPaused: false,
          reason: "Pause period has ended, should be disabled",
        };
      }
    }

    return { isPaused: false };
  }

  // Helper Methods for Schedule Calculations
  private calculateNextPaymentDate(
    currentDate: Date,
    frequency: RecurringFrequency,
    metadata: any = {}
  ): Date {
    const now = new Date();
    let nextDate = new Date(currentDate);

    switch (frequency) {
      case RecurringFrequency.HOURLY:
        return this.calculateHourlyNextDate(currentDate, metadata, now);
      case RecurringFrequency.DAILY:
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case RecurringFrequency.WEEKLY:
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case RecurringFrequency.BI_WEEKLY:
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case RecurringFrequency.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case RecurringFrequency.QUARTERLY:
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case RecurringFrequency.YEARLY:
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      case RecurringFrequency.CUSTOM:
        return this.calculateCustomNextDate(currentDate, metadata, now);
      default:
        nextDate.setDate(nextDate.getDate() + 1);
    }

    // Apply exclusions for non-hourly frequencies
    return this.applyExclusions(nextDate, metadata);
  }

  private calculateHourlyNextDate(
    currentDate: Date,
    metadata: any,
    now: Date
  ): Date {
    const scheduleWindow = metadata?.scheduleWindow || {};
    const hourlyInterval = metadata?.hourlyInterval || 1;
    const startHour = scheduleWindow.startHour ?? 0;
    const endHour = scheduleWindow.endHour ?? 23;

    let nextDate = new Date(currentDate);

    // If current date is in the past or present, find next occurrence
    if (currentDate <= now) {
      nextDate = new Date(now);
    }

    // Add the hourly interval
    nextDate.setHours(nextDate.getHours() + hourlyInterval);

    // Ensure we're within the schedule window
    nextDate = this.adjustToScheduleWindow(nextDate, metadata);

    // Apply exclusions
    nextDate = this.applyExclusions(nextDate, metadata);

    // If the calculated date is still in the past, recurse
    if (nextDate <= now) {
      return this.calculateHourlyNextDate(nextDate, metadata, now);
    }

    return nextDate;
  }

  private calculateCustomNextDate(
    currentDate: Date,
    metadata: any,
    now: Date
  ): Date {
    const customInterval = metadata?.customInterval || 1;
    const customTimes = metadata?.customTimes || [];

    let nextDate = new Date(currentDate);

    if (currentDate <= now) {
      nextDate = new Date(now);
    }

    if (customTimes.length > 0) {
      // Find the next specific time
      const currentTimeStr = `${nextDate
        .getHours()
        .toString()
        .padStart(2, "0")}:${nextDate
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
      const todayTimes = customTimes
        .filter((time: string) => time > currentTimeStr)
        .sort();

      if (todayTimes.length > 0) {
        // Use next time today
        const [hours, minutes] = todayTimes[0].split(":").map(Number);
        nextDate.setHours(hours, minutes, 0, 0);
      } else {
        // Move to next day at first time
        nextDate.setDate(nextDate.getDate() + customInterval);
        const [hours, minutes] = customTimes[0].split(":").map(Number);
        nextDate.setHours(hours, minutes, 0, 0);
      }
    } else {
      // Just use the interval
      nextDate.setDate(nextDate.getDate() + customInterval);
    }

    // Apply exclusions
    nextDate = this.applyExclusions(nextDate, metadata);

    // If still in past, recurse
    if (nextDate <= now) {
      return this.calculateCustomNextDate(nextDate, metadata, now);
    }

    return nextDate;
  }

  private adjustToScheduleWindow(date: Date, metadata: any): Date {
    const scheduleWindow = metadata?.scheduleWindow || {};
    const startHour = scheduleWindow.startHour ?? 0;
    const endHour = scheduleWindow.endHour ?? 23;

    const result = new Date(date);
    const currentHour = result.getHours();

    // If before start hour, move to start hour
    if (currentHour < startHour) {
      result.setHours(startHour, 0, 0, 0);
    }
    // If at or after end hour, move to next day start hour
    else if (currentHour >= endHour) {
      result.setDate(result.getDate() + 1);
      result.setHours(startHour, 0, 0, 0);
    }

    return result;
  }

  private applyExclusions(date: Date, metadata: any): Date {
    const result = new Date(date);
    const excludedDays = metadata?.excludedDays || [];
    const excludedHours = metadata?.excludedHours || [];
    const excludedDates = metadata?.excludedDates || [];
    const skipWeekends = metadata?.skipWeekends ?? true;

    let needsAdjustment = false;

    do {
      needsAdjustment = false;

      // Check excluded days
      const dayOfWeek = result.getDay();
      if (excludedDays.includes(dayOfWeek)) {
        result.setDate(result.getDate() + 1);
        result.setHours(0, 0, 0, 0);
        needsAdjustment = true;
        continue;
      }

      // Check skip weekends (backward compatibility)
      if (skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        result.setDate(result.getDate() + (dayOfWeek === 0 ? 1 : 2));
        result.setHours(0, 0, 0, 0);
        needsAdjustment = true;
        continue;
      }

      // Check excluded hours
      const hour = result.getHours();
      if (excludedHours.includes(hour)) {
        result.setHours(hour + 1, 0, 0, 0);
        needsAdjustment = true;
        continue;
      }

      // Check excluded specific dates
      const dateString = result.toISOString().split("T")[0];
      const isExcludedDate = excludedDates.some((excludedDate: Date) => {
        const excludedDateStr = new Date(excludedDate)
          .toISOString()
          .split("T")[0];
        return excludedDateStr === dateString;
      });

      if (isExcludedDate) {
        result.setDate(result.getDate() + 1);
        result.setHours(0, 0, 0, 0);
        needsAdjustment = true;
        continue;
      }
    } while (needsAdjustment);

    return result;
  }

  private isWithinScheduleWindow(
    date: Date,
    metadata: any
  ): { withinWindow: boolean; reason?: string } {
    const scheduleWindow = metadata?.scheduleWindow || {};
    const startHour = scheduleWindow.startHour ?? 0;
    const endHour = scheduleWindow.endHour ?? 23;

    const hour = date.getHours();

    if (hour < startHour) {
      return {
        withinWindow: false,
        reason: `Before schedule window (${startHour}:00)`,
      };
    }

    if (hour >= endHour) {
      return {
        withinWindow: false,
        reason: `After schedule window (ends at ${endHour}:00)`,
      };
    }

    return { withinWindow: true };
  }

  private checkExclusions(
    date: Date,
    metadata: any
  ): { excluded: boolean; reason?: string } {
    const excludedDays = metadata?.excludedDays || [];
    const excludedHours = metadata?.excludedHours || [];
    const excludedDates = metadata?.excludedDates || [];

    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    const dateString = date.toISOString().split("T")[0];

    // Check excluded days
    if (excludedDays.includes(dayOfWeek)) {
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      return { excluded: true, reason: `Excluded day: ${dayNames[dayOfWeek]}` };
    }

    // Check excluded hours
    if (excludedHours.includes(hour)) {
      return { excluded: true, reason: `Excluded hour: ${hour}:00` };
    }

    // Check excluded dates
    const isExcludedDate = excludedDates.some((excludedDate: Date) => {
      const excludedDateStr = new Date(excludedDate)
        .toISOString()
        .split("T")[0];
      return excludedDateStr === dateString;
    });

    if (isExcludedDate) {
      return { excluded: true, reason: `Excluded date: ${dateString}` };
    }

    return { excluded: false };
  }

  async createRecurringPayment(
    req: Request
  ): Promise<ServiceResponse<RecurringPaymentData>> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = (req as any).user;

      if (!user || !user._id) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as RecurringPaymentData,
          success: false,
          message: "User authentication required",
        };
      }

      if (!isValidObjectId(user._id.toString())) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as RecurringPaymentData,
          success: false,
          message: "Invalid user ID format",
        };
      }

      const validatedBody = CreateRecurringPaymentSchema.parse(req.body);

      const sanitizedAmount = parseFloat(
        sanitizeInput(validatedBody.amount.toString())
      );
      const sanitizedCurrency = sanitizeInput(
        validatedBody.currency
      ).toUpperCase();
      const sanitizedDescription = validatedBody.description
        ? sanitizeInput(validatedBody.description).substring(0, 500)
        : undefined;
      const sanitizedFrequency = sanitizeInput(
        validatedBody.frequency
      ) as RecurringFrequency;
      const sanitizedStartDate = new Date(
        sanitizeInput(validatedBody.startDate.toString())
      );
      const sanitizedEndDate = validatedBody.endDate
        ? new Date(sanitizeInput(validatedBody.endDate.toString()))
        : undefined;
      const sanitizedToUser = sanitizeInput(validatedBody.toUser);
      const sanitizedPaymentMethod = sanitizeInput(validatedBody.paymentMethod);
      const sanitizedPinCode = sanitizeInput(validatedBody.pinCode);

      const now = new Date();
      if (sanitizedStartDate < now) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as RecurringPaymentData,
          success: false,
          message:
            "Start date cannot be in the past. You can start immediately or in the future.",
        };
      }

      const defaultMetadata = {
        scheduleWindow: {
          startHour: 0,
          endHour: 23,
          timezone: "UTC",
        },
        excludedDays: [0, 6],
        skipWeekends: true,
        hourlyInterval: 1,
      };

      let sanitizedMetadata: any = { ...defaultMetadata };

      if (validatedBody.metadata) {
        try {
          const metadata = sanitizeMetadata(validatedBody.metadata);

          // Preserve skipWeekends from default if not provided
          if (metadata.skipWeekends === undefined) {
            metadata.skipWeekends = defaultMetadata.skipWeekends;
          }

          // Handle customDatetimes according to the schema format
          if (
            metadata.customDatetimes &&
            Array.isArray(metadata.customDatetimes)
          ) {
            // Get timezone from metadata or use default
            const timezone =
              metadata.timezone || defaultMetadata.scheduleWindow.timezone;

            metadata.customDatetimes = metadata.customDatetimes.map(
              (item: any, index: number) => {
                try {
                  if (typeof item === "string") {
                    // Handle ISO string input
                    const dateObj = new Date(item);
                    // Convert to UTC for storage
                    const utcDate = new Date(
                      Date.UTC(
                        dateObj.getUTCFullYear(),
                        dateObj.getUTCMonth(),
                        dateObj.getUTCDate(),
                        dateObj.getUTCHours(),
                        dateObj.getUTCMinutes(),
                        dateObj.getUTCSeconds()
                      )
                    );

                    return {
                      date: utcDate,
                      time12h: `${dateObj.getUTCHours() % 12 || 12}:${dateObj
                        .getUTCMinutes()
                        .toString()
                        .padStart(2, "0")} ${
                        dateObj.getUTCHours() >= 12 ? "PM" : "AM"
                      }`,
                    };
                  } else if (item && typeof item === "object") {
                    // Handle the { date: "2025-12-24", time: "2:00 AM" } format
                    const time12h = item.time.toUpperCase().trim();
                    const timeMatch = time12h.match(/(\d+):?(\d+)?\s*(AM|PM)/i);

                    if (!timeMatch) {
                      throw new Error(`Invalid time format: ${item.time}`);
                    }

                    let hours = parseInt(timeMatch[1]);
                    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
                    const period = timeMatch[3].toUpperCase();

                    // 12-hour to 24-hour conversion
                    let hours24 = hours;
                    if (period === "PM" && hours !== 12) hours24 += 12;
                    if (period === "AM" && hours === 12) hours24 = 0;

                    // Parse the date string (assuming YYYY-MM-DD format)
                    if (!item.date || !item.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                      throw new Error(
                        `Invalid date format: ${item.date}. Expected YYYY-MM-DD`
                      );
                    }

                    const [year, month, day] = item.date.split("-").map(Number);

                    // For UTC timezone, create UTC date
                    let utcDate: Date;
                    if (timezone === "UTC") {
                      utcDate = new Date(
                        Date.UTC(year, month - 1, day, hours24, minutes, 0)
                      );
                    } else {
                      // For non-UTC timezones, create local date then convert to UTC
                      const localDate = new Date(
                        year,
                        month - 1,
                        day,
                        hours24,
                        minutes,
                        0
                      );
                      utcDate = new Date(localDate.toISOString());
                    }

                    // Validate the date
                    if (isNaN(utcDate.getTime())) {
                      throw new Error(
                        `Invalid date/time combination: ${item.date} ${item.time}`
                      );
                    }

                    // Store in schema format
                    return {
                      date: utcDate,
                      time12h: item.time, // Store original 12-hour format
                    };
                  } else if (item.date && item.time12h) {
                    // Already in correct schema format
                    const date = new Date(item.date);
                    if (isNaN(date.getTime())) {
                      throw new Error(`Invalid date: ${item.date}`);
                    }
                    return {
                      date: date,
                      time12h: item.time12h,
                    };
                  }
                  throw new Error("Invalid customDatetime format");
                } catch (error: any) {
                  throw new Error(
                    `Failed to parse customDatetime at index ${index}: ${error.message}`
                  );
                }
              }
            );
          }

          // Merge metadata, ensuring scheduleWindow is properly merged
          sanitizedMetadata = {
            ...sanitizedMetadata,
            ...metadata,
            scheduleWindow: {
              ...sanitizedMetadata.scheduleWindow,
              ...metadata.scheduleWindow,
            },
          };

          if (
            (sanitizedFrequency === RecurringFrequency.HOURLY ||
              sanitizedFrequency === RecurringFrequency.CUSTOM) &&
            sanitizedMetadata.scheduleWindow.startHour >=
              sanitizedMetadata.scheduleWindow.endHour
          ) {
            throw new Error(
              "startHour must be less than endHour for hourly/custom payments"
            );
          }

          if (sanitizedFrequency === RecurringFrequency.CUSTOM) {
            if (
              !sanitizedMetadata.customDatetimes ||
              !Array.isArray(sanitizedMetadata.customDatetimes) ||
              sanitizedMetadata.customDatetimes.length === 0
            ) {
              throw new Error(
                "customDatetimes is required for custom frequency and must be a non-empty array"
              );
            }

            // Validate all custom dates are in the future
            const now = new Date();
            for (const datetime of sanitizedMetadata.customDatetimes) {
              const date = new Date(datetime.date);
              if (isNaN(date.getTime())) {
                throw new Error(
                  `Invalid date in customDatetimes: ${datetime.date}`
                );
              }
              if (date < now) {
                throw new Error(
                  "All custom payment dates must be in the future"
                );
              }
            }

            // Sort custom datetimes by date for consistency
            sanitizedMetadata.customDatetimes.sort(
              (a: any, b: any) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            );
          }

          if (sanitizedMetadata.pauseEnabled) {
            if (
              !sanitizedMetadata.pauseStartDate ||
              !sanitizedMetadata.pauseEndDate
            ) {
              throw new Error(
                "pauseStartDate and pauseEndDate are required when pauseEnabled is true"
              );
            }
            if (
              sanitizedMetadata.pauseStartDate >= sanitizedMetadata.pauseEndDate
            ) {
              throw new Error("pauseEndDate must be after pauseStartDate");
            }
          }
        } catch (error: any) {
          await session.abortTransaction();
          session.endSession();
          return {
            status: httpStatus.BAD_REQUEST,
            data: {} as RecurringPaymentData,
            success: false,
            message: error.message,
          };
        }
      }

      // Ensure customDatetimes is properly set for custom frequency
      if (
        sanitizedFrequency === RecurringFrequency.CUSTOM &&
        (!sanitizedMetadata.customDatetimes ||
          sanitizedMetadata.customDatetimes.length === 0)
      ) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as RecurringPaymentData,
          success: false,
          message: "customDatetimes is required for custom frequency",
        };
      }

      const amountValidation = validatePaymentAmount(
        sanitizedAmount,
        sanitizedCurrency
      );
      if (!amountValidation.valid) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as RecurringPaymentData,
          success: false,
          message: amountValidation.message,
        };
      }

      const dateValidation = validateDateRange(
        sanitizedStartDate,
        sanitizedEndDate,
        365 * 5
      );
      if (!dateValidation.valid) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as RecurringPaymentData,
          success: false,
          message: dateValidation.message,
        };
      }

      const userWithSensitiveData = await User.findById(user._id)
        .select("+password +encryptedPrivateKey +pinCode")
        .session(session);

      if (!userWithSensitiveData) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as RecurringPaymentData,
          success: false,
          message: "User not found",
        };
      }

      const pinResult = await PinHelper.getDecryptedPrivateKey(
        userWithSensitiveData.toObject(),
        sanitizedPinCode
      );

      if (!pinResult.success) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as RecurringPaymentData,
          success: false,
          message: pinResult.error || "PIN verification failed",
        };
      }

      let recipientUser = null;

      if (isValidPublicKey(sanitizedToUser)) {
        recipientUser = await User.findOne({
          stellarPublicKey: sanitizedToUser,
        })
          .select("_id username primaryEmail stellarPublicKey isActive")
          .lean();
      } else {
        const emailValidation = validateEmail(sanitizedToUser);
        if (emailValidation.valid) {
          recipientUser = await User.findOne({
            primaryEmail: sanitizedToUser,
          })
            .select("_id username primaryEmail stellarPublicKey isActive")
            .lean();
        } else {
          recipientUser = await User.findOne({
            username: sanitizedToUser,
          })
            .select("_id username primaryEmail stellarPublicKey isActive")
            .lean();
        }
      }

      if (!recipientUser) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as RecurringPaymentData,
          success: false,
          message: "Recipient not found or account is not active",
        };
      }

      const selfPaymentCheck = preventSelfPayment(
        user._id.toString(),
        sanitizedToUser,
        recipientUser
      );
      if (!selfPaymentCheck.valid) {
        logSecurityEvent(
          "self_payment_attempt",
          user._id.toString(),
          {},
          "medium"
        );
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as RecurringPaymentData,
          success: false,
          message: selfPaymentCheck.message,
        };
      }

      if (
        sanitizedPaymentMethod !== "fiat" &&
        !recipientUser.stellarPublicKey
      ) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as RecurringPaymentData,
          success: false,
          message:
            "Recipient does not have a Stellar wallet for crypto payments",
        };
      }

      const scheduleId = `sched_${nanoid(16)}`;

      let processedMetadata = { ...sanitizedMetadata };

      // Process metadata based on frequency
      switch (sanitizedFrequency) {
        case RecurringFrequency.DAILY:
        case RecurringFrequency.WEEKLY:
        case RecurringFrequency.BI_WEEKLY:
        case RecurringFrequency.MONTHLY:
        case RecurringFrequency.QUARTERLY:
        case RecurringFrequency.YEARLY:
          if (processedMetadata.scheduleTimes) {
            processedMetadata.customTimes = processedMetadata.scheduleTimes;
          }
          break;

        case RecurringFrequency.HOURLY:
          if (processedMetadata.specificHours) {
            processedMetadata.hourlySpecificHours =
              processedMetadata.specificHours;
          }
          break;

        case RecurringFrequency.CUSTOM:
          if (processedMetadata.customDatetimes) {
            // Create customFullDatetimes from the customDatetimes array
            const customFullDatetimes = processedMetadata.customDatetimes.map(
              (item: any) => {
                if (typeof item === "object" && item.date) {
                  // Convert to ISO string
                  const dateObj = new Date(item.date);
                  if (isNaN(dateObj.getTime())) {
                    throw new Error(
                      `Invalid date in customDatetimes: ${item.date}`
                    );
                  }
                  return dateObj.toISOString();
                } else if (typeof item === "string") {
                  // Already an ISO string
                  return item;
                }
                throw new Error("Invalid customDatetime item format");
              }
            );

            // Create customTimes from the ISO strings (in 24-hour format)
            const customTimes = customFullDatetimes.map((isoString: string) => {
              const date = new Date(isoString);
              if (isNaN(date.getTime())) {
                throw new Error(`Invalid ISO string: ${isoString}`);
              }
              return `${date.getUTCHours().toString().padStart(2, "0")}:${date
                .getUTCMinutes()
                .toString()
                .padStart(2, "0")}`;
            });

            processedMetadata.customTimes = customTimes;
            processedMetadata.customFullDatetimes = customFullDatetimes;
          }
          break;
      }

      let nextPaymentDate: Date;

      // For custom frequency, ensure nextPaymentDate is the first custom datetime
      if (
        sanitizedFrequency === RecurringFrequency.CUSTOM &&
        processedMetadata.customFullDatetimes &&
        processedMetadata.customFullDatetimes.length > 0
      ) {
        // Sort custom datetimes and find the next one after start date
        const sortedDatetimes = processedMetadata.customFullDatetimes
          .map((dt: string) => new Date(dt))
          .sort((a: Date, b: Date) => a.getTime() - b.getTime());

        const nextDateTime = sortedDatetimes.find(
          (dt: Date) => dt >= sanitizedStartDate
        );

        if (nextDateTime) {
          nextPaymentDate = nextDateTime;
        } else {
          // If all custom dates are before start date, use the first one
          nextPaymentDate = sortedDatetimes[0];
        }
      } else {
        // For other frequencies, use the standard calculation
        nextPaymentDate = this.calculateNextPaymentDate(
          sanitizedStartDate,
          sanitizedFrequency,
          processedMetadata
        );
      }

      // Validate nextPaymentDate
      if (!nextPaymentDate || isNaN(nextPaymentDate.getTime())) {
        throw new Error("Failed to calculate valid next payment date");
      }

      await PinHelper.cacheUserPin(user._id.toString(), sanitizedPinCode);

      const recurringPayment: any = new RecurringPayment({
        scheduleId,
        fromUser: user._id,
        toUser: recipientUser._id,
        amount: sanitizedAmount,
        currency: sanitizedCurrency,
        description: sanitizedDescription,
        frequency: sanitizedFrequency,
        startDate: sanitizedStartDate,
        endDate: sanitizedEndDate,
        nextPaymentDate,
        status: "active" as RecurringPaymentStatus,
        paymentMethod: sanitizedPaymentMethod,
        metadata: processedMetadata,
        pinVerified: true,
        blockchainTxHashes: [],
        fiatPaymentRefs: [],
      });

      await recurringPayment.save({ session });

      await session.commitTransaction();
      session.endSession();

      logSecurityEvent(
        "recurring_payment_created",
        user._id.toString(),
        {
          scheduleId,
          amount: sanitizedAmount,
          currency: sanitizedCurrency,
          frequency: sanitizedFrequency,
          recipientId: recipientUser._id.toString(),
          startDate: sanitizedStartDate,
          nextPaymentDate,
          metadata: processedMetadata,
        },
        "low"
      );

      await emitEvent("recurring:payment:created", {
        scheduleId,
        fromUser: user._id,
        toUser: recipientUser._id,
        amount: sanitizedAmount,
        currency: sanitizedCurrency,
        frequency: sanitizedFrequency,
        nextPaymentDate,
        metadata: processedMetadata,
      }).catch((err) =>
        console.error("Error emitting recurring payment event:", err)
      );

      return {
        status: httpStatus.CREATED,
        data: {
          recurringPayment: {
            id: recurringPayment._id.toString(),
            scheduleId: recurringPayment.scheduleId,
            fromUser: user._id,
            toUser: recipientUser._id,
            amount: recurringPayment.amount,
            currency: recurringPayment.currency,
            description: recurringPayment.description,
            frequency: recurringPayment.frequency,
            startDate: recurringPayment.startDate,
            endDate: recurringPayment.endDate,
            nextPaymentDate: recurringPayment.nextPaymentDate,
            status: recurringPayment.status as RecurringPaymentStatus,
            metadata: recurringPayment.metadata,
            pinVerified: recurringPayment.pinVerified,
            createdAt: recurringPayment.createdAt,
            updatedAt: recurringPayment.updatedAt,
          },
        },
        success: true,
        message: "Recurring payment created successfully",
      };
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();

      console.error("Error creating recurring payment:", error);

      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as RecurringPaymentData,
          success: false,
          message: `${errorMessages}`,
        };
      }

      if (
        error.message?.includes("security") ||
        error.message?.includes("Invalid")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as RecurringPaymentData,
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as RecurringPaymentData,
        success: false,
        message: "Error creating recurring payment",
      };
    }
  }

  async editRecurringPayment(
    req: Request
  ): Promise<ServiceResponse<RecurringPaymentData>> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as RecurringPaymentData,
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as RecurringPaymentData,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate request body with Zod
      const validatedBody = EditRecurringPaymentSchema.parse(req.body);

      // SECURITY: Sanitize all inputs
      const sanitizedScheduleId = sanitizeInput(validatedBody.scheduleId);
      const sanitizedPinCode = sanitizeInput(validatedBody.pinCode);
      const sanitizedAmount = validatedBody.amount
        ? parseFloat(sanitizeInput(validatedBody.amount.toString()))
        : undefined;
      const sanitizedCurrency = validatedBody.currency
        ? sanitizeInput(validatedBody.currency).toUpperCase()
        : undefined;
      const sanitizedDescription = validatedBody.description
        ? sanitizeInput(validatedBody.description).substring(0, 500)
        : undefined;
      const sanitizedFrequency = validatedBody.frequency
        ? (sanitizeInput(validatedBody.frequency) as RecurringFrequency)
        : undefined;
      const sanitizedEndDate = validatedBody.endDate
        ? new Date(sanitizeInput(validatedBody.endDate.toString()))
        : undefined;

      // Sanitize metadata
      let sanitizedMetadata: any = {};
      if (validatedBody.metadata) {
        try {
          sanitizedMetadata = sanitizeMetadata(validatedBody.metadata);
        } catch (error: any) {
          await session.abortTransaction();
          session.endSession();
          return {
            status: httpStatus.BAD_REQUEST,
            data: {} as RecurringPaymentData,
            success: false,
            message: error.message,
          };
        }
      }

      // Get user with PIN for verification
      const userWithSensitiveData = await User.findById(user._id)
        .select("+password +encryptedPrivateKey +pinCode")
        .session(session);

      if (!userWithSensitiveData) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as RecurringPaymentData,
          success: false,
          message: "User not found",
        };
      }

      // Verify PIN
      const pinResult = await PinHelper.getDecryptedPrivateKey(
        userWithSensitiveData.toObject(),
        sanitizedPinCode
      );

      if (!pinResult.success) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as RecurringPaymentData,
          success: false,
          message: pinResult.error || "PIN verification failed",
        };
      }

      // Find recurring payment
      const recurringPayment: any = await RecurringPayment.findOne({
        scheduleId: sanitizedScheduleId,
      }).session(session);

      if (!recurringPayment) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as RecurringPaymentData,
          success: false,
          message: "Recurring payment not found",
        };
      }

      // SECURITY: Check if user is authorized to edit
      const fromUserId = recurringPayment.fromUser.toString();
      const userId = user._id.toString();

      if (fromUserId !== userId) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.FORBIDDEN,
          data: {} as RecurringPaymentData,
          success: false,
          message: "Only the creator can edit this recurring payment",
        };
      }

      // NEW: Check if payment is paused before allowing edits
      const pauseCheck = this.checkIfPaused(recurringPayment);
      if (pauseCheck.isPaused && recurringPayment.status === "paused") {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as RecurringPaymentData,
          success: false,
          message: `Cannot edit recurring payment while it is paused: ${pauseCheck.reason}`,
        };
      }

      // FIXED: Check if recurring payment can be edited
      // Define statuses that cannot be edited
      const cannotEditStatuses: RecurringPaymentStatus[] = [
        "cancelled",
        "completed",
      ];

      if (
        cannotEditStatuses.includes(
          recurringPayment.status as RecurringPaymentStatus
        )
      ) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as RecurringPaymentData,
          success: false,
          message: `Cannot edit recurring payment with status: ${recurringPayment.status}`,
        };
      }

      // Update fields if provided
      if (sanitizedAmount !== undefined) {
        const amountValidation = validatePaymentAmount(
          sanitizedAmount,
          recurringPayment.currency
        );
        if (!amountValidation.valid) {
          await session.abortTransaction();
          session.endSession();
          return {
            status: httpStatus.BAD_REQUEST,
            data: {} as RecurringPaymentData,
            success: false,
            message: amountValidation.message,
          };
        }
        recurringPayment.amount = sanitizedAmount;
      }

      if (sanitizedCurrency) {
        recurringPayment.currency = sanitizedCurrency;
      }

      if (sanitizedDescription !== undefined) {
        recurringPayment.description = sanitizedDescription;
      }

      if (sanitizedFrequency) {
        recurringPayment.frequency = sanitizedFrequency;
        // Recalculate next payment date if frequency changed
        if (recurringPayment.status === "active") {
          recurringPayment.nextPaymentDate = this.calculateNextPaymentDate(
            recurringPayment.nextPaymentDate,
            sanitizedFrequency,
            recurringPayment.metadata
          );
        }
      }

      if (sanitizedEndDate !== undefined) {
        // Validate new end date
        if (sanitizedEndDate < recurringPayment.startDate) {
          await session.abortTransaction();
          session.endSession();
          return {
            status: httpStatus.BAD_REQUEST,
            data: {} as RecurringPaymentData,
            success: false,
            message: "End date cannot be before start date",
          };
        }
        recurringPayment.endDate = sanitizedEndDate;
      }

      // Update metadata
      if (Object.keys(sanitizedMetadata).length > 0) {
        // Merge metadata
        recurringPayment.metadata = {
          ...recurringPayment.metadata,
          ...sanitizedMetadata,
        };

        // Handle schedule window validation for hourly/custom
        if (
          recurringPayment.frequency === RecurringFrequency.HOURLY ||
          recurringPayment.frequency === RecurringFrequency.CUSTOM
        ) {
          const scheduleWindow = recurringPayment.metadata.scheduleWindow;
          if (
            scheduleWindow &&
            scheduleWindow.startHour >= scheduleWindow.endHour
          ) {
            await session.abortTransaction();
            session.endSession();
            return {
              status: httpStatus.BAD_REQUEST,
              data: {} as RecurringPaymentData,
              success: false,
              message:
                "startHour must be less than endHour for hourly/custom payments",
            };
          }
        }

        // Handle pause functionality
        if (sanitizedMetadata.pauseEnabled !== undefined) {
          if (sanitizedMetadata.pauseEnabled) {
            // Enable pause
            if (
              !sanitizedMetadata.pauseStartDate ||
              !sanitizedMetadata.pauseEndDate
            ) {
              await session.abortTransaction();
              session.endSession();
              return {
                status: httpStatus.BAD_REQUEST,
                data: {} as RecurringPaymentData,
                success: false,
                message:
                  "Both pauseStartDate and pauseEndDate are required when enabling pause",
              };
            }

            const pauseStart = new Date(sanitizedMetadata.pauseStartDate);
            const pauseEnd = new Date(sanitizedMetadata.pauseEndDate);

            if (pauseStart >= pauseEnd) {
              await session.abortTransaction();
              session.endSession();
              return {
                status: httpStatus.BAD_REQUEST,
                data: {} as RecurringPaymentData,
                success: false,
                message: "pauseStartDate must be before pauseEndDate",
              };
            }

            // Check if next payment date falls within pause period
            if (
              recurringPayment.nextPaymentDate >= pauseStart &&
              recurringPayment.nextPaymentDate <= pauseEnd
            ) {
              // Skip to after pause period
              recurringPayment.nextPaymentDate = this.calculateNextPaymentDate(
                pauseEnd,
                recurringPayment.frequency,
                recurringPayment.metadata
              );
            }

            // Set status to paused if currently active
            if (recurringPayment.status === "active") {
              recurringPayment.status = "paused" as RecurringPaymentStatus;
            }
          } else {
            // Disable pause - clear pause dates and set back to active if was paused
            recurringPayment.metadata.pauseStartDate = undefined;
            recurringPayment.metadata.pauseEndDate = undefined;
            recurringPayment.metadata.pauseReason = undefined;

            // If it was paused due to metadata, set back to active
            if (
              recurringPayment.status === "paused" &&
              !recurringPayment.metadata.pauseEnabled
            ) {
              recurringPayment.status = "active" as RecurringPaymentStatus;
            }
          }
        }
      }

      // Recalculate next payment date with current metadata
      if (recurringPayment.status === "active") {
        recurringPayment.nextPaymentDate = this.calculateNextPaymentDate(
          recurringPayment.nextPaymentDate,
          recurringPayment.frequency,
          recurringPayment.metadata
        );
      }

      await recurringPayment.save({ session });

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      // Add security log
      logSecurityEvent(
        "recurring_payment_edited",
        user._id.toString(),
        {
          scheduleId: recurringPayment.scheduleId,
          updatedFields: Object.keys(validatedBody).filter(
            (key) => key !== "scheduleId" && key !== "pinCode"
          ),
        },
        "low"
      );

      // Emit notification event
      await emitEvent("recurring:payment:edited", {
        scheduleId: recurringPayment.scheduleId,
        fromUser: recurringPayment.fromUser,
        toUser: recurringPayment.toUser,
        amount: recurringPayment.amount,
        currency: recurringPayment.currency,
        frequency: recurringPayment.frequency,
        nextPaymentDate: recurringPayment.nextPaymentDate,
        metadata: recurringPayment.metadata,
        newStatus: recurringPayment.status,
      }).catch((err) =>
        console.error("Error emitting recurring payment edited event:", err)
      );

      return {
        status: httpStatus.OK,
        data: {
          recurringPayment: {
            id: recurringPayment._id.toString(),
            scheduleId: recurringPayment.scheduleId,
            fromUser: recurringPayment.fromUser,
            toUser: recurringPayment.toUser,
            amount: recurringPayment.amount,
            currency: recurringPayment.currency,
            description: recurringPayment.description,
            frequency: recurringPayment.frequency,
            startDate: recurringPayment.startDate,
            endDate: recurringPayment.endDate,
            nextPaymentDate: recurringPayment.nextPaymentDate,
            status: recurringPayment.status as RecurringPaymentStatus,
            metadata: recurringPayment.metadata,
            pinVerified: recurringPayment.pinVerified,
            createdAt: recurringPayment.createdAt,
            updatedAt: recurringPayment.updatedAt,
          },
        },
        success: true,
        message: "Recurring payment updated successfully",
      };
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();

      console.error("Error editing recurring payment:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as RecurringPaymentData,
          success: false,
          message: `${errorMessages}`,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as RecurringPaymentData,
        success: false,
        message: "Error editing recurring payment",
      };
    }
  }

  async getProcessingStats(req: Request): Promise<ServiceResponse<any>> {
    try {
      const stats = await batchPaymentProcessor.getQueueStats();

      return {
        status: httpStatus.OK,
        data: stats,
        success: true,
        message: "Processing stats retrieved successfully",
      };
    } catch (error: any) {
      console.error("Error getting processing stats:", error);
      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {},
        success: false,
        message: "Error getting processing stats",
      };
    }
  }

  async getRecurringPayment(
    req: Request
  ): Promise<ServiceResponse<RecurringPaymentDetails>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as RecurringPaymentDetails,
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as RecurringPaymentDetails,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate query parameters with Zod
      const validatedQuery = GetRecurringPaymentSchema.parse(req.query);

      // SECURITY: Sanitize schedule ID
      const sanitizedScheduleId = sanitizeInput(validatedQuery.scheduleId);

      // Find recurring payment
      const recurringPayment = await RecurringPayment.findOne({
        scheduleId: sanitizedScheduleId,
      })
        .populate(
          "fromUser",
          "username primaryEmail userProfileUrl stellarPublicKey"
        )
        .populate(
          "toUser",
          "username primaryEmail userProfileUrl stellarPublicKey"
        )
        .lean();

      if (!recurringPayment) {
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as RecurringPaymentDetails,
          success: false,
          message: "Recurring payment not found",
        };
      }

      // SECURITY: Check if user is authorized to view this
      const fromUserId = recurringPayment.fromUser._id.toString();
      const toUserId = recurringPayment.toUser._id.toString();
      const userId = user._id.toString();

      if (fromUserId !== userId && toUserId !== userId) {
        return {
          status: httpStatus.FORBIDDEN,
          data: {} as RecurringPaymentDetails,
          success: false,
          message: "Not authorized to view this recurring payment",
        };
      }

      // NEW: Add pause status check to response
      const pauseCheck = this.checkIfPaused(recurringPayment);
      const enhancedMetadata = {
        ...recurringPayment.metadata,
        isCurrentlyPaused: pauseCheck.isPaused,
        pauseReason: pauseCheck.reason,
      };

      return {
        status: httpStatus.OK,
        data: {
          recurringPayment: {
            id: recurringPayment._id.toString(),
            scheduleId: recurringPayment.scheduleId,
            fromUser: recurringPayment.fromUser,
            toUser: recurringPayment.toUser,
            amount: recurringPayment.amount,
            currency: recurringPayment.currency,
            description: recurringPayment.description,
            frequency: recurringPayment.frequency,
            startDate: recurringPayment.startDate,
            endDate: recurringPayment.endDate,
            nextPaymentDate: recurringPayment.nextPaymentDate,
            status: recurringPayment.status as RecurringPaymentStatus,
            metadata: enhancedMetadata,
            paymentMethod: recurringPayment.paymentMethod,
            pinVerified: recurringPayment.pinVerified,
            blockchainTxHashes: recurringPayment.blockchainTxHashes,
            fiatPaymentRefs: recurringPayment.fiatPaymentRefs,
            createdAt: recurringPayment.createdAt,
            updatedAt: recurringPayment.updatedAt,
          },
        },
        success: true,
        message: "Recurring payment retrieved successfully",
      };
    } catch (error: any) {
      console.error("Error getting recurring payment:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as RecurringPaymentDetails,
          success: false,
          message: `${errorMessages}`,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as RecurringPaymentDetails,
        success: false,
        message: "Error getting recurring payment",
      };
    }
  }

  async listRecurringPayments(
    req: Request
  ): Promise<ServiceResponse<RecurringPaymentsList>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as RecurringPaymentsList,
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as RecurringPaymentsList,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate query parameters with Zod
      const validatedQuery = ListRecurringPaymentsSchema.parse(req.query);

      // SECURITY: Sanitize inputs
      const sanitizedPage = parseInt(
        sanitizeInput(validatedQuery.page.toString()),
        10
      );
      const sanitizedLimit = parseInt(
        sanitizeInput(validatedQuery.limit.toString()),
        10
      );
      const sanitizedStatus = validatedQuery.status
        ? (sanitizeInput(validatedQuery.status) as RecurringPaymentStatus)
        : undefined;
      const sanitizedDirection = validatedQuery.direction
        ? sanitizeInput(validatedQuery.direction)
        : undefined;

      // Build query
      const query: any = {};

      if (sanitizedDirection === "sent") {
        query.fromUser = user._id;
      } else if (sanitizedDirection === "received") {
        query.toUser = user._id;
      } else if (sanitizedDirection === "all") {
        // Show both sent and received
        query.$or = [{ fromUser: user._id }, { toUser: user._id }];
      } else {
        // Show both sent and received
        query.$or = [{ fromUser: user._id }, { toUser: user._id }];
      }

      if (sanitizedStatus) {
        query.status = sanitizedStatus;
      }

      // Calculate pagination
      const skip = (sanitizedPage - 1) * sanitizedLimit;

      // Execute queries
      const [recurringPayments, total] = await Promise.all([
        RecurringPayment.find(query)
          .populate("fromUser", "username primaryEmail userProfileUrl")
          .populate("toUser", "username primaryEmail userProfileUrl")
          .sort({ nextPaymentDate: 1 })
          .skip(skip)
          .limit(sanitizedLimit)
          .lean(),
        RecurringPayment.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / sanitizedLimit);

      // NEW: Enhance each payment with pause status
      const enhancedPayments = recurringPayments.map((rp) => {
        const pauseCheck = this.checkIfPaused(rp);
        const enhancedMetadata = {
          ...rp.metadata,
          isCurrentlyPaused: pauseCheck.isPaused,
          pauseReason: pauseCheck.reason,
        };

        return {
          id: rp._id.toString(),
          scheduleId: rp.scheduleId,
          fromUser: rp.fromUser,
          toUser: rp.toUser,
          amount: rp.amount,
          currency: rp.currency,
          description: rp.description,
          frequency: rp.frequency,
          status: pauseCheck.isPaused ? "paused" : rp.status,
          nextPaymentDate: rp.nextPaymentDate,
          startDate: rp.startDate,
          endDate: rp.endDate,
          pinVerified: rp.pinVerified,
          metadata: enhancedMetadata,
          createdAt: rp.createdAt,
          updatedAt: rp.updatedAt,
        };
      });

      return {
        status: httpStatus.OK,
        data: {
          recurringPayments: enhancedPayments,
          pagination: {
            page: sanitizedPage,
            limit: sanitizedLimit,
            total,
            totalPages,
          },
        },
        success: true,
        message: "Recurring payments retrieved successfully",
      };
    } catch (error: any) {
      console.error("Error listing recurring payments:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as RecurringPaymentsList,
          success: false,
          message: `${errorMessages}`,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as RecurringPaymentsList,
        success: false,
        message: "Error listing recurring payments",
      };
    }
  }

  async cancelRecurringPayment(
    req: Request
  ): Promise<ServiceResponse<CancelRecurringData>> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as CancelRecurringData,
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as CancelRecurringData,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate request body with Zod
      const validatedBody = CancelRecurringPaymentSchema.parse(req.body);

      // SECURITY: Sanitize all inputs
      const sanitizedScheduleId = sanitizeInput(validatedBody.scheduleId);
      const sanitizedReason = validatedBody.reason
        ? sanitizeInput(validatedBody.reason)
        : undefined;

      // Get user for PIN verification
      const userWithSensitiveData = await User.findById(user._id)
        .select("+password +encryptedPrivateKey +pinCode")
        .session(session);

      if (!userWithSensitiveData) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as CancelRecurringData,
          success: false,
          message: "User not found",
        };
      }

      // Find recurring payment
      const recurringPayment = await RecurringPayment.findOne({
        scheduleId: sanitizedScheduleId,
      })
        .populate("fromUser", "username primaryEmail")
        .populate("toUser", "username primaryEmail")
        .session(session);

      if (!recurringPayment) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as CancelRecurringData,
          success: false,
          message: "Recurring payment not found",
        };
      }

      // NEW: Check if payment is paused
      const pauseCheck = this.checkIfPaused(recurringPayment);

      // SECURITY: Check if user is authorized to cancel
      const fromUserId = recurringPayment.fromUser._id.toString();
      const toUserId = recurringPayment.toUser._id.toString();
      const userId = user._id.toString();

      let canCancel = false;
      let isSender = false;

      if (fromUserId === userId) {
        canCancel = true;
        isSender = true;
      } else if (toUserId === userId) {
        // Receiver can only cancel if the payment is currently paused
        if (pauseCheck.isPaused || recurringPayment.status === "paused") {
          canCancel = true;
        } else {
          await session.abortTransaction();
          session.endSession();
          return {
            status: httpStatus.FORBIDDEN,
            data: {} as CancelRecurringData,
            success: false,
            message: "Receiver can only cancel during an active pause period",
          };
        }
      }

      if (!canCancel) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.FORBIDDEN,
          data: {} as CancelRecurringData,
          success: false,
          message: "Not authorized to cancel this recurring payment",
        };
      }

      // FIXED: Check if can be cancelled - using proper status type
      const cannotCancelStatuses: RecurringPaymentStatus[] = [
        "cancelled",
        "completed",
      ];

      if (
        cannotCancelStatuses.includes(
          recurringPayment.status as RecurringPaymentStatus
        )
      ) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as CancelRecurringData,
          success: false,
          message: `Cannot cancel recurring payment with status: ${recurringPayment.status}`,
        };
      }

      // NEW: Verify PIN for sender only (receiver doesn't need PIN if payment is paused)
      if (isSender) {
        const pinResult = await PinHelper.verifyPin(
          userWithSensitiveData.toObject(),
          validatedBody.pinCode || ""
        );

        if (!pinResult.isValid) {
          await session.abortTransaction();
          session.endSession();
          return {
            status: httpStatus.UNAUTHORIZED,
            data: {} as CancelRecurringData,
            success: false,
            message: pinResult.error || "PIN verification failed",
          };
        }
      }

      // Update status
      recurringPayment.status = "cancelled" as RecurringPaymentStatus;
      if (sanitizedReason) {
        recurringPayment.metadata = {
          ...recurringPayment.metadata,
          cancellationReason: sanitizedReason,
          cancelledBy: isSender ? "sender" : "receiver",
          cancelledAt: new Date().toISOString(),
          wasPaused:
            pauseCheck.isPaused || recurringPayment.status === "paused",
        };
      }
      await recurringPayment.save({ session });

      // Clear cached PIN since payment is cancelled
      if (isSender) {
        await PinHelper.clearCachedUserPin(user._id.toString());
      }

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      // Add security log
      logSecurityEvent(
        "recurring_payment_cancelled",
        user._id.toString(),
        {
          scheduleId: recurringPayment.scheduleId,
          reason: sanitizedReason,
          cancelledBy: isSender ? "sender" : "receiver",
          wasPaused: pauseCheck.isPaused,
        },
        "low"
      );

      // Emit notification event
      const eventData = {
        scheduleId: recurringPayment.scheduleId,
        fromUser: recurringPayment.fromUser._id,
        toUser: recurringPayment.toUser._id,
        amount: recurringPayment.amount,
        currency: recurringPayment.currency,
        cancelledBy: isSender ? "sender" : "receiver",
        reason: sanitizedReason,
        wasPaused: pauseCheck.isPaused || recurringPayment.status === "paused",
      };

      await emitEvent("recurring:payment:cancelled", eventData).catch((err) =>
        console.error("Error emitting recurring payment cancelled event:", err)
      );

      // Send notification to the other party
      const notificationUserId = isSender
        ? recurringPayment.toUser._id
        : recurringPayment.fromUser._id;
      const notificationMessage = isSender
        ? `Recurring payment schedule ${recurringPayment.scheduleId} has been cancelled by the sender`
        : `Recurring payment schedule ${recurringPayment.scheduleId} has been cancelled by the receiver during pause period`;

      await emitEvent("send:notification", {
        userId: notificationUserId,
        type: "recurring_payment_cancelled",
        title: "Recurring Payment Cancelled",
        message: notificationMessage,
        data: {
          scheduleId: recurringPayment.scheduleId,
          amount: recurringPayment.amount,
          currency: recurringPayment.currency,
          cancelledBy: isSender ? "sender" : "receiver",
          reason: sanitizedReason,
          wasPaused: pauseCheck.isPaused,
        },
      }).catch((err) =>
        console.error("Error emitting notification event:", err)
      );

      return {
        status: httpStatus.OK,
        data: { success: true },
        success: true,
        message: "Recurring payment cancelled successfully",
      };
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();

      console.error("Error cancelling recurring payment:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as CancelRecurringData,
          success: false,
          message: `${errorMessages}`,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as CancelRecurringData,
        success: false,
        message: "Error cancelling recurring payment",
      };
    }
  }

  // NEW: Updated batch processing with pause checks
  private async processBatchPayments(): Promise<{
    processed: number;
    skipped: number;
    failed: number;
    paused: number;
    skipsDueToExclusions: number;
    skipsDueToWindow: number;
    skipsDueToPause: number;
  }> {
    const now = new Date();
    const session = await mongoose.startSession();

    let processed = 0;
    let skipped = 0;
    let failed = 0;
    let paused = 0;
    let skipsDueToExclusions = 0;
    let skipsDueToWindow = 0;
    let skipsDueToPause = 0;

    try {
      session.startTransaction();

      // Find all due recurring payments
      const duePayments = await RecurringPayment.find({
        status: "active",
        nextPaymentDate: { $lte: now },
      })
        .populate("fromUser", "username primaryEmail stellarPublicKey")
        .populate("toUser", "username primaryEmail stellarPublicKey")
        .session(session);

      for (const recurringPayment of duePayments) {
        try {
          // NEW: Check if payment is paused before processing
          const pauseCheck = this.checkIfPaused(recurringPayment);

          if (pauseCheck.isPaused) {
            // Update metadata to track pause skips
            recurringPayment.metadata = {
              ...recurringPayment.metadata,
              lastSkippedDueToPause: now.toISOString(),
              skipCount: (recurringPayment.metadata?.skipCount || 0) + 1,
              lastSkipReason: pauseCheck.reason,
            };

            // If the payment is in pause period via metadata but status is still active,
            // we should update the status to paused
            if (recurringPayment.status === "active") {
              recurringPayment.status = "paused" as RecurringPaymentStatus;
            }

            await recurringPayment.save({ session });
            paused++;
            skipsDueToPause++;
            console.log(
              `Payment ${recurringPayment.scheduleId} is paused: ${pauseCheck.reason}`
            );
            continue;
          }

          // Check if payment should be skipped due to schedule window
          const windowCheck = this.isWithinScheduleWindow(
            now,
            recurringPayment.metadata
          );
          if (!windowCheck.withinWindow) {
            // Update next payment date to next valid window
            const nextValidDate = this.calculateNextPaymentDate(
              recurringPayment.nextPaymentDate,
              recurringPayment.frequency,
              recurringPayment.metadata
            );

            recurringPayment.nextPaymentDate = nextValidDate;
            recurringPayment.metadata = {
              ...recurringPayment.metadata,
              lastSkippedDueToWindow: now.toISOString(),
              windowSkipCount:
                (recurringPayment.metadata?.windowSkipCount || 0) + 1,
              lastSkipReason: windowCheck.reason,
            };

            await recurringPayment.save({ session });
            skipped++;
            skipsDueToWindow++;
            continue;
          }

          // Check if payment should be skipped due to exclusions
          const exclusionCheck = this.checkExclusions(
            now,
            recurringPayment.metadata
          );
          if (exclusionCheck.excluded) {
            // Update next payment date
            const nextValidDate = this.calculateNextPaymentDate(
              recurringPayment.nextPaymentDate,
              recurringPayment.frequency,
              recurringPayment.metadata
            );

            recurringPayment.nextPaymentDate = nextValidDate;
            recurringPayment.metadata = {
              ...recurringPayment.metadata,
              lastSkippedDueToExclusion: now.toISOString(),
              exclusionSkipCount:
                (recurringPayment.metadata?.exclusionSkipCount || 0) + 1,
              lastSkipReason: exclusionCheck.reason,
            };

            await recurringPayment.save({ session });
            skipped++;
            skipsDueToExclusions++;
            continue;
          }

          // Process the payment
          const paymentResult = await this.processSinglePayment(
            recurringPayment,
            session
          );

          if (paymentResult.success) {
            processed++;
          } else {
            failed++;

            // Update metadata with failure information
            recurringPayment.metadata = {
              ...recurringPayment.metadata,
              lastFailedAttempt: now.toISOString(),
              failureReason: paymentResult.error || "Payment failed",
              failedCount: (recurringPayment.metadata?.failedCount || 0) + 1,
            };
            await recurringPayment.save({ session });
          }
        } catch (error: any) {
          console.error(
            `Error processing payment ${recurringPayment.scheduleId}:`,
            error
          );
          failed++;

          // Update metadata with error information
          recurringPayment.metadata = {
            ...recurringPayment.metadata,
            lastFailedAttempt: now.toISOString(),
            failureReason: error.message || "Unknown error",
            failedCount: (recurringPayment.metadata?.failedCount || 0) + 1,
          };
          await recurringPayment.save({ session });
        }
      }

      await session.commitTransaction();
      session.endSession();

      return {
        processed,
        skipped,
        failed,
        paused,
        skipsDueToExclusions,
        skipsDueToWindow,
        skipsDueToPause,
      };
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();

      console.error("Error in batch processing:", error);
      throw error;
    }
  }

  async processRecurringPayment(req: Request): Promise<ServiceResponse<any>> {
    try {
      const user = (req as any).user;

      // SECURITY: This endpoint should be system/admin only
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {},
          success: false,
          message: "Authentication required",
        };
      }

      // Check if user has admin/system permissions
      const isSystemUser =
        user.roles?.includes("admin") || user.roles?.includes("system");

      if (!isSystemUser) {
        // Check if they're requesting a specific payment they own
        const validatedQuery = GetRecurringPaymentSchema.parse(req.query);
        const scheduleId = validatedQuery.scheduleId;

        if (!scheduleId) {
          return {
            status: httpStatus.FORBIDDEN,
            data: {},
            success: false,
            message: "Only system users can process all payments",
          };
        }
      }

      const validatedQuery = GetRecurringPaymentSchema.parse(req.query);
      const scheduleId = validatedQuery.scheduleId
        ? sanitizeInput(validatedQuery.scheduleId)
        : undefined;

      if (scheduleId) {
        // Process specific payment (manual trigger)
        return await this.processSinglePaymentManual(scheduleId);
      } else {
        // Process all due payments (batch mode - system/admin only)
        const result = await this.processBatchPayments();

        return {
          status: httpStatus.OK,
          data: {
            ...result,
            timestamp: new Date().toISOString(),
          },
          success: true,
          message: `Batch processing completed: ${result.processed} processed, ${result.skipped} skipped, ${result.paused} paused, ${result.failed} failed`,
        };
      }
    } catch (error: any) {
      console.error("Error in processRecurringPayment:", error);

      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {},
          success: false,
          message: `${errorMessages}`,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {},
        success: false,
        message: "Error processing recurring payments",
      };
    }
  }

  private async processSinglePaymentManual(
    scheduleId: string
  ): Promise<ServiceResponse<any>> {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // Find the payment
      const recurringPayment: any = await RecurringPayment.findOne({
        scheduleId,
      })
        .populate("fromUser", "username primaryEmail stellarPublicKey")
        .populate("toUser", "username primaryEmail stellarPublicKey")
        .session(session);

      if (!recurringPayment) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.NOT_FOUND,
          data: {},
          success: false,
          message: "Recurring payment not found",
        };
      }

      // NEW: Check if payment is paused
      const pauseCheck = this.checkIfPaused(recurringPayment);
      if (pauseCheck.isPaused) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.BAD_REQUEST,
          data: {},
          success: false,
          message: `Payment is paused: ${pauseCheck.reason}`,
        };
      }

      // Check if payment is active and due
      if (recurringPayment.status !== "active") {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.BAD_REQUEST,
          data: {},
          success: false,
          message: `Payment is not active: ${recurringPayment.status}`,
        };
      }

      if (new Date() < recurringPayment.nextPaymentDate) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.BAD_REQUEST,
          data: {},
          success: false,
          message: "Payment is not due yet",
        };
      }

      // Check if payment should be skipped due to schedule window
      const windowCheck = this.isWithinScheduleWindow(
        new Date(),
        recurringPayment.metadata
      );
      if (!windowCheck.withinWindow) {
        // Update to next valid date
        const nextValidDate = this.calculateNextPaymentDate(
          recurringPayment.nextPaymentDate,
          recurringPayment.frequency,
          recurringPayment.metadata
        );

        await session.commitTransaction();
        session.endSession();

        return {
          status: httpStatus.OK,
          data: {
            scheduleId: recurringPayment.scheduleId,
            originalDate: recurringPayment.nextPaymentDate,
            nextPaymentDate: nextValidDate,
            status: "skipped_due_to_window",
            message: `Payment skipped: ${windowCheck.reason}`,
          },
          success: true,
          message: "Payment skipped due to schedule window",
        };
      }

      // Check if payment should be skipped due to exclusions
      const exclusionCheck = this.checkExclusions(
        new Date(),
        recurringPayment.metadata
      );
      if (exclusionCheck.excluded) {
        const nextValidDate = this.calculateNextPaymentDate(
          recurringPayment.nextPaymentDate,
          recurringPayment.frequency,
          recurringPayment.metadata
        );

        await session.commitTransaction();
        session.endSession();

        return {
          status: httpStatus.OK,
          data: {
            scheduleId: recurringPayment.scheduleId,
            originalDate: recurringPayment.nextPaymentDate,
            nextPaymentDate: nextValidDate,
            status: "skipped_due_to_exclusion",
            message: `Payment skipped: ${exclusionCheck.reason}`,
          },
          success: true,
          message: "Payment skipped due to exclusion",
        };
      }

      // Process the actual payment
      const paymentResult = await this.processSinglePayment(
        recurringPayment,
        session
      );

      if (!paymentResult.success) {
        await session.abortTransaction();
        session.endSession();

        return {
          status: httpStatus.BAD_REQUEST,
          data: {},
          success: false,
          message: paymentResult.error || "Payment processing failed",
        };
      }

      await session.commitTransaction();
      session.endSession();

      return {
        status: httpStatus.OK,
        data: {
          scheduleId: recurringPayment.scheduleId,
          nextPaymentDate: recurringPayment.nextPaymentDate,
          status: recurringPayment.status,
          blockchainTxHash: paymentResult.blockchainTxHash,
          fiatPaymentRef: paymentResult.fiatPaymentRef,
          metadata: recurringPayment.metadata,
        },
        success: true,
        message: "Payment processed successfully",
      };
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();

      console.error("Error in manual payment processing:", error);

      if (error.message?.includes("Insufficient balance")) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {},
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {},
        success: false,
        message: "Error processing payment",
      };
    }
  }

  private async processSinglePayment(
    recurringPayment: any,
    session: mongoose.ClientSession
  ): Promise<{
    success: boolean;
    error?: string;
    blockchainTxHash?: string;
    fiatPaymentRef?: string;
  }> {
    try {
      // NEW: Double-check pause status before processing
      const pauseCheck = this.checkIfPaused(recurringPayment);
      if (pauseCheck.isPaused) {
        return {
          success: false,
          error: `Payment is paused: ${pauseCheck.reason}`,
        };
      }

      // Get sender user
      const senderUser = await User.findById(recurringPayment.fromUser._id)
        .select("+password +encryptedPrivateKey +pinCode")
        .session(session);

      if (!senderUser) {
        return { success: false, error: "Sender user not found" };
      }

      // Get decrypted private key from cache or verify PIN
      const pinResult = await PinHelper.getDecryptedPrivateKey(
        senderUser.toObject()
      );

      if (!pinResult.success) {
        return {
          success: false,
          error: pinResult.error || "PIN verification failed",
        };
      }

      // Process payment
      let blockchainTxHash: string | undefined;
      let fiatPaymentRef: string | undefined;

      if (recurringPayment.paymentMethod !== "fiat") {
        const blockchain = BlockchainFactory.getTransactionProvider("stellar");
        const paymentParams: any = {
          user: {
            ...senderUser.toObject(),
            privateKey: pinResult.decryptedPrivateKey,
          },
          assetCode:
            recurringPayment.currency === "XLM"
              ? "NATIVE"
              : recurringPayment.currency,
          address: recurringPayment.toUser.stellarPublicKey,
          amount: recurringPayment.amount.toString(),
          transactionDetails: `Recurring payment: ${recurringPayment.scheduleId}`,
        };

        const paymentResult = await blockchain.payment(paymentParams);
        blockchainTxHash = paymentResult.data.hash;
        recurringPayment.blockchainTxHashes.push(blockchainTxHash);
      } else {
        fiatPaymentRef = `fiat_${nanoid(16)}`;
        recurringPayment.fiatPaymentRefs.push(fiatPaymentRef);
      }

      // Update recurring payment
      recurringPayment.lastProcessedAt = new Date();
      recurringPayment.nextPaymentDate = this.calculateNextPaymentDate(
        recurringPayment.nextPaymentDate,
        recurringPayment.frequency,
        recurringPayment.metadata
      );

      // Update metadata with payment information
      recurringPayment.metadata = {
        ...recurringPayment.metadata,
        lastProcessedAmount: recurringPayment.amount,
        lastProcessedCurrency: recurringPayment.currency,
        lastProcessedDate: new Date().toISOString(),
        totalProcessedCount:
          (recurringPayment.metadata?.totalProcessedCount || 0) + 1,
      };

      // Check if end date reached
      if (
        recurringPayment.endDate &&
        recurringPayment.nextPaymentDate > recurringPayment.endDate
      ) {
        recurringPayment.status = "completed" as RecurringPaymentStatus;
      }

      await recurringPayment.save({ session });

      // Emit events
      await emitEvent("recurring:payment:processed", {
        scheduleId: recurringPayment.scheduleId,
        fromUser: recurringPayment.fromUser._id,
        toUser: recurringPayment.toUser._id,
        amount: recurringPayment.amount,
        currency: recurringPayment.currency,
        blockchainTxHash,
        fiatPaymentRef,
        nextPaymentDate: recurringPayment.nextPaymentDate,
      }).catch((err) => console.error("Error emitting event:", err));

      return {
        success: true,
        blockchainTxHash,
        fiatPaymentRef,
      };
    } catch (error: any) {
      console.error(
        `Error in single payment processing for ${recurringPayment.scheduleId}:`,
        error
      );
      return {
        success: false,
        error: error.message || "Payment processing failed",
      };
    }
  }

  // Helper Methods
  private async checkAndHandlePauseSkip(
    recurringPayment: any,
    session: mongoose.ClientSession
  ): Promise<{ skipped: boolean; nextPaymentDate?: Date; reason?: string }> {
    if (recurringPayment.metadata?.pauseEnabled) {
      const now = new Date();
      const pauseStart = recurringPayment.metadata.pauseStartDate
        ? new Date(recurringPayment.metadata.pauseStartDate)
        : null;
      const pauseEnd = recurringPayment.metadata.pauseEndDate
        ? new Date(recurringPayment.metadata.pauseEndDate)
        : null;

      if (pauseStart && pauseEnd && now >= pauseStart && now <= pauseEnd) {
        // Calculate next payment date after pause
        const nextDateAfterPause = this.calculateNextPaymentDate(
          pauseEnd,
          recurringPayment.frequency,
          recurringPayment.metadata
        );

        // Update recurring payment
        recurringPayment.nextPaymentDate = nextDateAfterPause;
        recurringPayment.metadata = {
          ...recurringPayment.metadata,
          lastSkippedDueToPause: now.toISOString(),
          skipCount: (recurringPayment.metadata.skipCount || 0) + 1,
          lastSkipReason:
            recurringPayment.metadata.pauseReason || "Payment paused",
        };

        await recurringPayment.save({ session });

        return {
          skipped: true,
          nextPaymentDate: nextDateAfterPause,
          reason: recurringPayment.metadata.pauseReason || "Payment paused",
        };
      }
    }

    return { skipped: false };
  }

  private async generateShortUrl(longUrl: string): Promise<string | undefined> {
    try {
      // Implement URL shortening service integration here
      // For now, return the long URL
      return longUrl;
    } catch (error) {
      console.error("Error generating short URL:", error);
      return undefined;
    }
  }

  private async generateQRCode(url: string): Promise<string> {
    try {
      const qrCode = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      return qrCode;
    } catch (error) {
      console.error("Error generating QR code:", error);
      return `${this.BASE_URL}/api/qr?url=${encodeURIComponent(url)}`;
    }
  }

  // NEW: Additional pause management methods
  async pauseRecurringPayment(
    scheduleId: string,
    userId: string,
    pauseStartDate?: Date,
    pauseEndDate?: Date,
    reason?: string
  ): Promise<ServiceResponse<any>> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const recurringPayment = await RecurringPayment.findOne({
        scheduleId,
        fromUser: userId,
        status: "active",
      }).session(session);

      if (!recurringPayment) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.NOT_FOUND,
          data: {},
          success: false,
          message: "Recurring payment not found or not active",
        };
      }

      const now = new Date();
      const pauseStart = pauseStartDate || now;
      const pauseEnd =
        pauseEndDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Default: 30 days

      if (pauseEnd <= pauseStart) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.BAD_REQUEST,
          data: {},
          success: false,
          message: "pauseEndDate must be after pauseStartDate",
        };
      }

      // Update payment
      recurringPayment.status = "paused" as RecurringPaymentStatus;
      recurringPayment.metadata = {
        ...recurringPayment.metadata,
        pauseEnabled: true,
        pauseStartDate: pauseStart,
        pauseEndDate: pauseEnd,
        pauseReason: reason || "Manually paused by user",
        lastPausedAt: now.toISOString(),
      };

      // If next payment date is within pause period, skip it
      if (
        recurringPayment.nextPaymentDate >= pauseStart &&
        recurringPayment.nextPaymentDate <= pauseEnd
      ) {
        recurringPayment.nextPaymentDate = this.calculateNextPaymentDate(
          pauseEnd,
          recurringPayment.frequency,
          recurringPayment.metadata
        );
      }

      await recurringPayment.save({ session });

      await session.commitTransaction();
      session.endSession();

      // Emit event
      await emitEvent("recurring:payment:paused", {
        scheduleId,
        fromUser: userId,
        toUser: recurringPayment.toUser,
        pauseStartDate: pauseStart,
        pauseEndDate: pauseEnd,
        reason,
        nextPaymentDate: recurringPayment.nextPaymentDate,
      }).catch((err) =>
        console.error("Error emitting payment paused event:", err)
      );

      return {
        status: httpStatus.OK,
        data: {
          scheduleId,
          status: "paused" as RecurringPaymentStatus,
          pauseStartDate: pauseStart,
          pauseEndDate: pauseEnd,
          nextPaymentDate: recurringPayment.nextPaymentDate,
          reason,
        },
        success: true,
        message: "Recurring payment paused successfully",
      };
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();

      console.error("Error pausing recurring payment:", error);
      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {},
        success: false,
        message: "Error pausing recurring payment",
      };
    }
  }

  async resumeRecurringPayment(
    scheduleId: string,
    userId: string
  ): Promise<ServiceResponse<any>> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const recurringPayment = await RecurringPayment.findOne({
        scheduleId,
        fromUser: userId,
        status: "paused",
      }).session(session);

      if (!recurringPayment) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.NOT_FOUND,
          data: {},
          success: false,
          message: "Recurring payment not found or not paused",
        };
      }

      // Update payment
      recurringPayment.status = "active" as RecurringPaymentStatus;
      recurringPayment.metadata = {
        ...recurringPayment.metadata,
        pauseEnabled: false,
        pauseEndDate: new Date(), // Mark pause as ended now
        lastResumedAt: new Date().toISOString(),
      };

      await recurringPayment.save({ session });

      await session.commitTransaction();
      session.endSession();

      // Emit event
      await emitEvent("recurring:payment:resumed", {
        scheduleId,
        fromUser: userId,
        toUser: recurringPayment.toUser,
        nextPaymentDate: recurringPayment.nextPaymentDate,
      }).catch((err) =>
        console.error("Error emitting payment resumed event:", err)
      );

      return {
        status: httpStatus.OK,
        data: {
          scheduleId,
          status: "active" as RecurringPaymentStatus,
          nextPaymentDate: recurringPayment.nextPaymentDate,
        },
        success: true,
        message: "Recurring payment resumed successfully",
      };
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();

      console.error("Error resuming recurring payment:", error);
      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {},
        success: false,
        message: "Error resuming recurring payment",
      };
    }
  }
}

// Create and export service instance
export const recurringPaymentService = new RecurringPaymentService();
