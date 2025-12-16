import { Request } from "express";
import { RecurringPayment } from "../models/RecurringPayment";
import { ServiceResponse } from "../types/response";
import { User } from "../models/User";
import { emitEvent } from "../microservices/rabbitmq";
import { PinHelper } from "../helpers/pin.helper";
import httpStatus from "http-status";
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
} from "../validators/recurringPayment";
import { BlockchainFactory } from "../providers/blockchainFactory";
import QRCode from "qrcode";
import { batchPaymentProcessor } from "./batchPaymentProcessor";
import { Request as ExpressRequest } from "express";
import mongoose, { Document, Types } from "mongoose";

export interface IPaymentRequestService {
  createPaymentRequest(
    req: ExpressRequest
  ): Promise<ServiceResponse<PaymentRequestData>>;
  getPaymentRequest(
    req: ExpressRequest
  ): Promise<ServiceResponse<PaymentRequestDetails>>;
  listPaymentRequests(
    req: ExpressRequest
  ): Promise<ServiceResponse<PaymentRequestsList>>;
  processPaymentRequest(
    req: ExpressRequest
  ): Promise<ServiceResponse<PaymentProcessData>>;
  cancelPaymentRequest(
    req: ExpressRequest
  ): Promise<ServiceResponse<CancelRequestData>>;
  generatePaymentQRCode(
    req: ExpressRequest
  ): Promise<ServiceResponse<QRCodeData>>;
  validatePaymentLink(
    req: ExpressRequest
  ): Promise<ServiceResponse<LinkValidationData>>;
}

// Enums
export enum PaymentRequestStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
  FAILED = "failed",
}

export enum PaymentMethod {
  CRYPTO = "crypto",
  FIAT = "fiat",
  BOTH = "both",
}

// User interface for type safety
export interface PaymentRequestUser {
  _id: string | Types.ObjectId;
  username: string;
  primaryEmail: string;
  userProfileUrl?: string;
  stellarPublicKey?: string;
}

// Response data interfaces
export interface PaymentRequestData {
  paymentRequest: {
    id: string;
    requestId: string;
    amount: number;
    currency: string;
    description?: string;
    expiresAt?: Date;
    status: PaymentRequestStatus;
    metadata?: any;
    qrCodeUrl: string;
    paymentLink: string;
    shortUrl?: string;
    createdAt: Date;
  };
}

export interface PaymentRequestDetails {
  paymentRequest: {
    id: string;
    requestId: string;
    fromUser: PaymentRequestUser;
    toUser: PaymentRequestUser;
    amount: number;
    currency: string;
    description?: string;
    expiresAt?: Date;
    status: PaymentRequestStatus;
    metadata?: any;
    qrCodeUrl: string;
    paymentLink: string;
    shortUrl?: string;
    paymentMethod: PaymentMethod;
    pinVerified: boolean;
    blockchainTxHash?: string;
    fiatPaymentRef?: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface PaymentRequestsList {
  paymentRequests: Array<{
    id: string;
    requestId: string;
    fromUser: PaymentRequestUser;
    toUser: PaymentRequestUser;
    amount: number;
    currency: string;
    description?: string;
    status: PaymentRequestStatus;
    expiresAt?: Date;
    paymentLink: string;
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

export interface PaymentProcessData {
  blockchainTxHash?: string;
  fiatPaymentRef?: string;
  paymentRequest: {
    id: string;
    requestId: string;
    status: PaymentRequestStatus;
    amount: number;
    currency: string;
  };
}

export interface CancelRequestData {
  success: boolean;
}

export interface QRCodeData {
  qrCode: string;
  qrCodeUrl: string;
  paymentLink: string;
  shortUrl?: string;
}

export interface LinkValidationData {
  isValid: boolean;
  paymentRequest?: {
    id: string;
    requestId: string;
    fromUser: PaymentRequestUser;
    toUser: PaymentRequestUser;
    amount: number;
    currency: string;
    description?: string;
    expiresAt?: Date;
    status: PaymentRequestStatus;
    paymentLink: string;
  };
  error?: string;
}

// Document interface
export interface IPaymentRequest extends Document {
  requestId: string;
  fromUser: any;
  toUser: any;
  amount: number;
  currency: string;
  description?: string;
  expiresAt?: Date;
  status: PaymentRequestStatus;
  paymentMethod: PaymentMethod;
  metadata: Record<string, any>;
  qrCodeUrl: string;
  paymentLink: string;
  shortUrl?: string;
  linkId: string;
  pinVerified: boolean;
  blockchainTxHash?: string;
  fiatPaymentRef?: string;
  createdAt: Date;
  updatedAt: Date;
}

// RECURRING PAYMENT

export interface IRecurringPaymentService {
  createRecurringPayment(
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
}

export enum RecurringFrequency {
  DAILY = "daily",
  WEEKLY = "weekly",
  BI_WEEKLY = "bi_weekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  YEARLY = "yearly",
}

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
    status: "active" | "paused" | "cancelled" | "completed";
    metadata?: any;
    pinVerified: boolean;
    createdAt: Date;
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
    status: "active" | "paused" | "cancelled" | "completed";
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
    status: "active" | "paused" | "cancelled" | "completed";
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
    status: "active" | "paused" | "cancelled" | "completed";
    amount: number;
    currency: string;
    nextPaymentDate: Date;
    pinVerified: boolean;
  };
  nextPaymentDate?: Date;
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
  status: "active" | "paused" | "cancelled" | "completed";
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

  async createRecurringPayment(
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
      const validatedBody = CreateRecurringPaymentSchema.parse(req.body);

      // SECURITY: Sanitize all inputs
      const sanitizedAmount = parseFloat(sanitizeInput(validatedBody.amount));
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

      // Sanitize metadata
      let sanitizedMetadata = {};
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

      // Validate amount
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

      // Validate date range
      const dateValidation = validateDateRange(
        sanitizedStartDate,
        sanitizedEndDate,
        365
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

      // Find recipient user
      let recipientUser = null;

      // Check if it's a Stellar public key
      if (isValidPublicKey(sanitizedToUser)) {
        recipientUser = await User.findOne({
          stellarPublicKey: sanitizedToUser,
        })
          .select("_id username primaryEmail stellarPublicKey isActive")
          .lean();
      } else {
        // Check by email or username
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

      // SECURITY: Prevent self-recurring payments
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

      // Check if recipient has a Stellar wallet (for crypto payments)
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

      // Generate schedule ID
      const scheduleId = `sched_${nanoid(16)}`;

      // Calculate next payment date
      const nextPaymentDate = this.calculateNextPaymentDate(
        sanitizedStartDate,
        sanitizedFrequency
      );

      // Cache PIN for future recurring payments
      await PinHelper.cacheUserPin(user._id.toString(), sanitizedPinCode);

      // Create recurring payment
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
        status: "active",
        paymentMethod: sanitizedPaymentMethod,
        metadata: sanitizedMetadata,
        pinVerified: true, // PIN verified during creation
        blockchainTxHashes: [],
        fiatPaymentRefs: [],
      });

      await recurringPayment.save({ session });

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      // Add security log
      logSecurityEvent(
        "recurring_payment_created",
        user._id.toString(),
        {
          scheduleId,
          amount: sanitizedAmount,
          currency: sanitizedCurrency,
          frequency: sanitizedFrequency,
          recipientId: recipientUser._id.toString(),
        },
        "low"
      );

      // Emit notification event
      await emitEvent("recurring:payment:created", {
        scheduleId,
        fromUser: user._id,
        toUser: recipientUser._id,
        amount: sanitizedAmount,
        currency: sanitizedCurrency,
        frequency: sanitizedFrequency,
        nextPaymentDate,
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
            status: recurringPayment.status,
            metadata: recurringPayment.metadata,
            pinVerified: recurringPayment.pinVerified,
            createdAt: recurringPayment.createdAt,
          },
        },
        success: true,
        message: "Recurring payment created successfully",
      };
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();

      console.error("Error creating recurring payment:", error);

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

      // Handle security validation errors
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
            status: recurringPayment.status,
            metadata: recurringPayment.metadata,
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
        ? sanitizeInput(validatedQuery.status)
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

      return {
        status: httpStatus.OK,
        data: {
          recurringPayments: recurringPayments.map((rp) => ({
            id: rp._id.toString(),
            scheduleId: rp.scheduleId,
            fromUser: rp.fromUser,
            toUser: rp.toUser,
            amount: rp.amount,
            currency: rp.currency,
            description: rp.description,
            frequency: rp.frequency,
            status: rp.status,
            nextPaymentDate: rp.nextPaymentDate,
            startDate: rp.startDate,
            endDate: rp.endDate,
            pinVerified: rp.pinVerified,
            createdAt: rp.createdAt,
            updatedAt: rp.updatedAt,
          })),
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
      }).session(session);

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

      // SECURITY: Check if user is authorized to cancel
      const fromUserId = recurringPayment.fromUser.toString();
      const userId = user._id.toString();

      if (fromUserId !== userId) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.FORBIDDEN,
          data: {} as CancelRecurringData,
          success: false,
          message: "Only the creator can cancel this recurring payment",
        };
      }

      // Check if can be cancelled
      if (
        recurringPayment.status === "cancelled" ||
        recurringPayment.status === "completed"
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

      // Update status
      recurringPayment.status = "cancelled";
      if (sanitizedReason) {
        recurringPayment.metadata = {
          ...recurringPayment.metadata,
          cancellationReason: sanitizedReason,
        };
      }
      await recurringPayment.save({ session });

      // Clear cached PIN since payment is cancelled
      await PinHelper.clearCachedUserPin(user._id.toString());

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
        },
        "low"
      );

      // Emit notification event
      await emitEvent("recurring:payment:cancelled", {
        scheduleId: recurringPayment.scheduleId,
        fromUser: recurringPayment.fromUser,
        toUser: recurringPayment.toUser,
        amount: recurringPayment.amount,
        currency: recurringPayment.currency,
        reason: sanitizedReason,
      }).catch((err) =>
        console.error("Error emitting recurring payment cancelled event:", err)
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

  // Update the processRecurringPayment method in RecurringPaymentService.ts
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
      // You'll need to implement this based on your user roles
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
        const result = await batchPaymentProcessor.processDuePayments();

        return {
          status: httpStatus.OK,
          data: {
            ...result,
            timestamp: new Date().toISOString(),
          },
          success: true,
          message: `Batch processing completed: ${result.processed} processed, ${result.failed} failed, ${result.retried} retried`,
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

      // Get sender user
      const senderUser = await User.findById(recurringPayment.fromUser._id)
        .select("+password +encryptedPrivateKey +pinCode")
        .session(session);

      if (!senderUser) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.NOT_FOUND,
          data: {},
          success: false,
          message: "Sender user not found",
        };
      }

      // Get decrypted private key
      const pinResult = await PinHelper.getDecryptedPrivateKey(
        senderUser.toObject()
      );

      if (!pinResult.success) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {},
          success: false,
          message: pinResult.error || "PIN verification failed",
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
        recurringPayment.frequency
      );

      if (
        recurringPayment.endDate &&
        recurringPayment.nextPaymentDate > recurringPayment.endDate
      ) {
        recurringPayment.status = "completed";
      }

      await recurringPayment.save({ session });

      await session.commitTransaction();
      session.endSession();

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
        status: httpStatus.OK,
        data: {
          blockchainTxHash,
          fiatPaymentRef,
          scheduleId: recurringPayment.scheduleId,
          nextPaymentDate: recurringPayment.nextPaymentDate,
          status: recurringPayment.status,
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

  // Helper Methods
  private calculateNextPaymentDate(
    currentDate: Date,
    frequency: RecurringFrequency
  ): Date {
    const nextDate = new Date(currentDate);

    switch (frequency) {
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
    }

    return nextDate;
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
}

// Create and export service instance
export const recurringPaymentService = new RecurringPaymentService();
