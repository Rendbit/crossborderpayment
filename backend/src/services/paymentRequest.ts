import { Request } from "express";
import httpStatus from "http-status";
import QRCode from "qrcode";
import { nanoid } from "nanoid";
import { PaymentRequest } from "../models/PaymentRequest";
import { User } from "../models/User";
import { BlockchainFactory } from "../providers/blockchainFactory";
import { emitEvent } from "../microservices/rabbitmq";
import { ServiceResponse } from "../types/response";
import {
  CreatePaymentRequestSchema,
  GetPaymentRequestSchema,
  ProcessPaymentRequestSchema,
  CancelPaymentRequestSchema,
  GenerateQRCodeSchema,
  ValidatePaymentLinkSchema,
  ListPaymentRequestsSchema,
  EditPaymentRequestSchema,
} from "../validators/paymentRequest";
import {
  sanitizeInput,
  isValidObjectId,
  isValidPublicKey,
  validatePaymentAmount,
  sanitizeMetadata,
  preventSelfPayment,
  logSecurityEvent,
  validateEmail,
} from "../utils/security";
import { PinHelper } from "../helpers/pin.helper";
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
  HOURLY = "hourly",
  DAILY = "daily",
  WEEKLY = "weekly",
  BI_WEEKLY = "bi_weekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  YEARLY = "yearly",
  CUSTOM = "custom" // For custom schedules
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

export class PaymentRequestService implements IPaymentRequestService {
  private readonly BASE_URL =
    process.env.DEV_CLIENT_URL || "https://finance.rendbit.com";

  async createPaymentRequest(
    req: Request
  ): Promise<ServiceResponse<PaymentRequestData>> {
    try {
      const user = (req as any).user;

      // SECURITY: Enhanced user validation
      if (!user || !user._id) {
        logSecurityEvent(
          "auth_failed",
          "unknown",
          { reason: "missing_user" },
          "high"
        );
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as PaymentRequestData,
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        logSecurityEvent(
          "invalid_input",
          user._id.toString(),
          {
            field: "userId",
            value: user._id,
          },
          "medium"
        );
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PaymentRequestData,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate request body with Zod
      const validatedBody = CreatePaymentRequestSchema.parse(req.body);

      // SECURITY: Enhanced sanitization and validation
      const sanitizedAmount = parseFloat(sanitizeInput(validatedBody.amount));
      const sanitizedCurrency = sanitizeInput(
        validatedBody.currency
      ).toUpperCase();
      const sanitizedDescription = validatedBody.description
        ? sanitizeInput(validatedBody.description).substring(0, 500)
        : undefined;
      const sanitizedExpiresIn = Math.min(
        Math.max(
          parseInt(sanitizeInput(validatedBody.expiresIn.toString()), 10),
          1
        ),
        30
      );
      const sanitizedToUser = sanitizeInput(validatedBody.toUser);
      const sanitizedPaymentMethod = sanitizeInput(validatedBody.paymentMethod);

      // Sanitize metadata
      let sanitizedMetadata = {};
      if (validatedBody.metadata) {
        try {
          sanitizedMetadata = sanitizeMetadata(validatedBody.metadata);
        } catch (error: any) {
          return {
            status: httpStatus.BAD_REQUEST,
            data: {} as PaymentRequestData,
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
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PaymentRequestData,
          success: false,
          message: amountValidation.message,
        };
      }

      // Find recipient with enhanced security
      let recipientUser = null;
      const isStellarKey = isValidPublicKey(sanitizedToUser);
      console.log({ isStellarKey, sanitizedToUser });
      if (isStellarKey) {
        recipientUser = await User.findOne({
          stellarPublicKey: sanitizedToUser,
        })
          .select("_id username primaryEmail stellarPublicKey isActive")
          .lean();
      } else {
        // Check if it's an email
        const emailValidation = validateEmail(sanitizedToUser);
        if (emailValidation.valid) {
          recipientUser = await User.findOne({
            primaryEmail: sanitizedToUser,
          })
            .select("_id username primaryEmail stellarPublicKey isActive")
            .lean();
        } else {
          // Check by username
          recipientUser = await User.findOne({
            username: sanitizedToUser,
          })
            .select("_id username primaryEmail stellarPublicKey isActive")
            .lean();
        }
      }

      if (!recipientUser) {
        logSecurityEvent(
          "recipient_not_found",
          user._id.toString(),
          {
            identifier: sanitizedToUser.substring(0, 10) + "...",
          },
          "low"
        );
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as PaymentRequestData,
          success: false,
          message: "Recipient not found or account is not active",
        };
      }

      // Check for self-payment
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
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PaymentRequestData,
          success: false,
          message: selfPaymentCheck.message,
        };
      }

      // Generate unique IDs
      const requestId = `req_${nanoid(16)}`;
      const linkId = `link_${nanoid(16)}`;

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + sanitizedExpiresIn);

      // Generate payment link
      const paymentLink = `${this.BASE_URL}/pay/${linkId}`;
      const shortUrl = await this.generateShortUrl(paymentLink);
      const qrCodeUrl = await this.generateQRCode(paymentLink);

      console.log("Sanitized Metadata ======= ", sanitizedMetadata)

      // Create payment request
      const paymentRequest: any = new PaymentRequest({
        requestId,
        fromUser: user._id,
        toUser: recipientUser._id,
        amount: sanitizedAmount,
        currency: sanitizedCurrency,
        description: sanitizedDescription,
        expiresAt,
        status: PaymentRequestStatus.PENDING,
        paymentMethod: sanitizedPaymentMethod,
        metadata: sanitizedMetadata,
        qrCodeUrl,
        paymentLink,
        shortUrl,
        linkId,
        pinVerified: false,
      });
  

      await paymentRequest.save();

      // Add security log for successful creation
      logSecurityEvent(
        "payment_request_created",
        user._id.toString(),
        {
          requestId,
          amount: sanitizedAmount,
          currency: sanitizedCurrency,
          recipientId: recipientUser._id.toString(),
        },
        "low"
      );

      // Emit notification event
      await emitEvent("payment:request:created", {
        requestId,
        fromUser: user._id,
        toUser: recipientUser._id,
        amount: sanitizedAmount,
        currency: sanitizedCurrency,
        paymentLink,
        qrCodeUrl,
      }).catch((err) =>
        console.error("Error emitting payment request event:", err)
      );

      return {
        status: httpStatus.CREATED,
        data: {
          paymentRequest: {
            id: paymentRequest._id.toString(),
            requestId: paymentRequest.requestId,
            amount: paymentRequest.amount,
            currency: paymentRequest.currency,
            description: paymentRequest.description,
            expiresAt: paymentRequest.expiresAt,
            status: paymentRequest.status,
            metadata: paymentRequest.metadata,
            qrCodeUrl: paymentRequest.qrCodeUrl,
            paymentLink: paymentRequest.paymentLink,
            shortUrl: paymentRequest.shortUrl,
            createdAt: paymentRequest.createdAt,
          },
        },
        success: true,
        message: "Payment request created successfully",
      };
    } catch (error: any) {
      console.error("Error creating payment request:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PaymentRequestData,
          success: false,
          message: `${errorMessages}`,
        };
      }

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("security")
      ) {
        logSecurityEvent(
          "security_validation_failed",
          "unknown",
          {
            error: error.message,
          },
          "high"
        );
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PaymentRequestData,
          success: false,
          message: "Security validation failed. Please check your input.",
        };
      }

      logSecurityEvent(
        "server_error",
        "unknown",
        {
          error: error.message,
          stack: error.stack,
        },
        "high"
      );

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as PaymentRequestData,
        success: false,
        message: "Error creating payment request",
      };
    }
  }

  async editPaymentRequest(
    req: Request
  ): Promise<ServiceResponse<PaymentRequestData>> {
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
          data: {} as PaymentRequestData,
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
          data: {} as PaymentRequestData,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate request body with Zod
      const validatedBody = EditPaymentRequestSchema.parse(req.body);

      // SECURITY: Sanitize all inputs
      const sanitizedRequestId = sanitizeInput(validatedBody.requestId);
      const sanitizedAmount = validatedBody.amount
        ? parseFloat(sanitizeInput(validatedBody.amount.toString()))
        : undefined;
      const sanitizedCurrency = validatedBody.currency
        ? sanitizeInput(validatedBody.currency).toUpperCase()
        : undefined;
      const sanitizedDescription = validatedBody.description
        ? sanitizeInput(validatedBody.description).substring(0, 500)
        : undefined;
      const sanitizedExpiresIn = validatedBody.expiresIn
        ? Math.min(
            Math.max(
              parseInt(sanitizeInput(validatedBody.expiresIn.toString()), 10),
              1
            ),
            30
          )
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
            data: {} as PaymentRequestData,
            success: false,
            message: error.message,
          };
        }
      }

      // Find payment request
      const paymentRequest: any = await PaymentRequest.findOne({
        requestId: sanitizedRequestId,
      }).session(session);

      if (!paymentRequest) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as PaymentRequestData,
          success: false,
          message: "Payment request not found",
        };
      }

      // SECURITY: Check if user is authorized to edit
      const fromUserId = paymentRequest.fromUser.toString();
      const userId = user._id.toString();

      if (fromUserId !== userId) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.FORBIDDEN,
          data: {} as PaymentRequestData,
          success: false,
          message: "Only the creator can edit this payment request",
        };
      }

      // Check if payment request can be edited
      if (paymentRequest.status !== PaymentRequestStatus.PENDING) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PaymentRequestData,
          success: false,
          message: `Cannot edit payment request with status: ${paymentRequest.status}`,
        };
      }

      // Check if request has expired
      if (paymentRequest.expiresAt && new Date() > paymentRequest.expiresAt) {
        paymentRequest.status = PaymentRequestStatus.EXPIRED;
        await paymentRequest.save({ session });
        await session.commitTransaction();
        session.endSession();

        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PaymentRequestData,
          success: false,
          message: "Payment request has expired and cannot be edited",
        };
      }

      // Update fields if provided
      if (sanitizedAmount !== undefined) {
        const amountValidation = validatePaymentAmount(
          sanitizedAmount,
          sanitizedCurrency || paymentRequest.currency
        );
        if (!amountValidation.valid) {
          await session.abortTransaction();
          session.endSession();
          return {
            status: httpStatus.BAD_REQUEST,
            data: {} as PaymentRequestData,
            success: false,
            message: amountValidation.message,
          };
        }
        paymentRequest.amount = sanitizedAmount;
      }

      if (sanitizedCurrency) {
        paymentRequest.currency = sanitizedCurrency;
      }

      if (sanitizedDescription !== undefined) {
        paymentRequest.description = sanitizedDescription;
      }

      if (sanitizedExpiresIn !== undefined) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + sanitizedExpiresIn);
        paymentRequest.expiresAt = expiresAt;
      }

      // Update metadata
      if (Object.keys(sanitizedMetadata).length > 0) {
        paymentRequest.metadata = {
          ...paymentRequest.metadata,
          ...sanitizedMetadata,
        };
      }

      await paymentRequest.save({ session });

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      // Add security log
      logSecurityEvent(
        "payment_request_edited",
        user._id.toString(),
        {
          requestId: paymentRequest.requestId,
          updatedFields: Object.keys(validatedBody).filter(
            (key) => key !== "requestId"
          ),
        },
        "low"
      );

      // Emit notification event
      await emitEvent("payment:request:edited", {
        requestId: paymentRequest.requestId,
        fromUser: paymentRequest.fromUser,
        toUser: paymentRequest.toUser,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        expiresAt: paymentRequest.expiresAt,
        metadata: paymentRequest.metadata,
      }).catch((err) =>
        console.error("Error emitting payment request edited event:", err)
      );

      return {
        status: httpStatus.OK,
        data: {
          paymentRequest: {
            id: paymentRequest._id.toString(),
            requestId: paymentRequest.requestId,
            amount: paymentRequest.amount,
            currency: paymentRequest.currency,
            description: paymentRequest.description,
            expiresAt: paymentRequest.expiresAt,
            status: paymentRequest.status,
            metadata: paymentRequest.metadata,
            qrCodeUrl: paymentRequest.qrCodeUrl,
            paymentLink: paymentRequest.paymentLink,
            shortUrl: paymentRequest.shortUrl,
            createdAt: paymentRequest.createdAt,
          },
        },
        success: true,
        message: "Payment request updated successfully",
      };
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();

      console.error("Error editing payment request:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PaymentRequestData,
          success: false,
          message: `${errorMessages}`,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as PaymentRequestData,
        success: false,
        message: "Error editing payment request",
      };
    }
  }

  async getPaymentRequest(
    req: Request
  ): Promise<ServiceResponse<PaymentRequestDetails>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as PaymentRequestDetails,
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PaymentRequestDetails,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate query parameters with Zod
      const validatedQuery = GetPaymentRequestSchema.parse(req.query);

      // SECURITY: Sanitize request ID
      const sanitizedRequestId = sanitizeInput(validatedQuery.requestId);

      // Find payment request
      const paymentRequest = await PaymentRequest.findOne({
        requestId: sanitizedRequestId,
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

      if (!paymentRequest) {
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as PaymentRequestDetails,
          success: false,
          message: "Payment request not found",
        };
      }

      // SECURITY: Check if user is authorized to view this request
      const fromUserId = paymentRequest.fromUser._id.toString();
      const toUserId = paymentRequest.toUser._id.toString();
      const userId = user._id.toString();

      if (fromUserId !== userId && toUserId !== userId) {
        return {
          status: httpStatus.FORBIDDEN,
          data: {} as PaymentRequestDetails,
          success: false,
          message: "Not authorized to view this payment request",
        };
      }

      // Check if request has expired
      if (
        paymentRequest.expiresAt &&
        new Date() > paymentRequest.expiresAt &&
        paymentRequest.status === PaymentRequestStatus.PENDING
      ) {
        await PaymentRequest.updateOne(
          { _id: paymentRequest._id },
          { $set: { status: PaymentRequestStatus.EXPIRED } }
        );
        paymentRequest.status = PaymentRequestStatus.EXPIRED;
      }

      return {
        status: httpStatus.OK,
        data: {
          paymentRequest: {
            id: paymentRequest._id.toString(),
            requestId: paymentRequest.requestId,
            fromUser: paymentRequest.fromUser,
            toUser: paymentRequest.toUser,
            amount: paymentRequest.amount,
            currency: paymentRequest.currency,
            description: paymentRequest.description,
            expiresAt: paymentRequest.expiresAt,
            status: paymentRequest.status,
            metadata: paymentRequest.metadata,
            qrCodeUrl: paymentRequest.qrCodeUrl,
            paymentLink: paymentRequest.paymentLink,
            shortUrl: paymentRequest.shortUrl,
            paymentMethod: paymentRequest.paymentMethod,
            pinVerified: paymentRequest.pinVerified,
            blockchainTxHash: paymentRequest.blockchainTxHash,
            fiatPaymentRef: paymentRequest.fiatPaymentRef,
            createdAt: paymentRequest.createdAt,
            updatedAt: paymentRequest.updatedAt,
          },
        },
        success: true,
        message: "Payment request retrieved successfully",
      };
    } catch (error: any) {
      console.error("Error getting payment request:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PaymentRequestDetails,
          success: false,
          message: `${errorMessages}`,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as PaymentRequestDetails,
        success: false,
        message: "Error getting payment request",
      };
    }
  }

  async listPaymentRequests(
    req: Request
  ): Promise<ServiceResponse<PaymentRequestsList>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as PaymentRequestsList,
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PaymentRequestsList,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate query parameters with Zod
      const validatedQuery = ListPaymentRequestsSchema.parse(req.query);

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
      const [paymentRequests, total] = await Promise.all([
        PaymentRequest.find(query)
          .populate("fromUser", "username primaryEmail userProfileUrl")
          .populate("toUser", "username primaryEmail userProfileUrl")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(sanitizedLimit)
          .lean(),
        PaymentRequest.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / sanitizedLimit);

      return {
        status: httpStatus.OK,
        data: {
          paymentRequests: paymentRequests.map((pr) => ({
            id: pr._id.toString(),
            requestId: pr.requestId,
            fromUser: pr.fromUser,
            toUser: pr.toUser,
            amount: pr.amount,
            currency: pr.currency,
            description: pr.description,
            status: pr.status,
            expiresAt: pr.expiresAt,
            paymentLink: pr.paymentLink,
            pinVerified: pr.pinVerified,
            createdAt: pr.createdAt,
            updatedAt: pr.updatedAt,
          })),
          pagination: {
            page: sanitizedPage,
            limit: sanitizedLimit,
            total,
            totalPages,
          },
        },
        success: true,
        message: "Payment requests retrieved successfully",
      };
    } catch (error: any) {
      console.error("Error listing payment requests:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PaymentRequestsList,
          success: false,
          message: `${errorMessages}`,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as PaymentRequestsList,
        success: false,
        message: "Error listing payment requests",
      };
    }
  }

  async processPaymentRequest(
    req: Request
  ): Promise<ServiceResponse<PaymentProcessData>> {
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
          data: {} as PaymentProcessData,
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
          data: {} as PaymentProcessData,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate request body with Zod
      const validatedBody = ProcessPaymentRequestSchema.parse(req.body);

      // SECURITY: Sanitize all inputs
      const sanitizedRequestId = sanitizeInput(validatedBody.requestId);
      const sanitizedPaymentMethod = sanitizeInput(validatedBody.paymentMethod);
      const sanitizedPinCode = sanitizeInput(validatedBody.pinCode);
      const sanitizedTransactionDetails = validatedBody.transactionDetails
        ? sanitizeInput(validatedBody.transactionDetails)
        : undefined;

      // Get user with sensitive data for PIN verification
      const userWithSensitiveData = await User.findById(user._id)
        .select("+password +encryptedPrivateKey +pinCode")
        .session(session);

      if (!userWithSensitiveData) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as PaymentProcessData,
          success: false,
          message: "User not found",
        };
      }

      // Find payment request
      const paymentRequest: any = await PaymentRequest.findOne({
        requestId: sanitizedRequestId,
      })
        .populate("fromUser", "username primaryEmail stellarPublicKey")
        .populate("toUser", "username primaryEmail stellarPublicKey")
        .session(session);

      if (!paymentRequest) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as PaymentProcessData,
          success: false,
          message: "Payment request not found",
        };
      }

      // SECURITY: Check if user is the recipient
      if (paymentRequest.toUser._id.toString() !== user._id.toString()) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.FORBIDDEN,
          data: {} as PaymentProcessData,
          success: false,
          message: "Only the recipient can process this payment request",
        };
      }

      // Check if request is still valid
      if (paymentRequest.status !== PaymentRequestStatus.PENDING) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PaymentProcessData,
          success: false,
          message: `Payment request is ${paymentRequest.status}`,
        };
      }

      // Check if request has expired
      if (paymentRequest.expiresAt && new Date() > paymentRequest.expiresAt) {
        paymentRequest.status = PaymentRequestStatus.EXPIRED;
        await paymentRequest.save({ session });
        await session.commitTransaction();
        session.endSession();

        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PaymentProcessData,
          success: false,
          message: "Payment request has expired",
        };
      }

      // NEW: Validate required metadata is present
      if (
        !paymentRequest.metadata?.invoiceNumber ||
        !paymentRequest.metadata?.invoiceDateAndTime ||
        !paymentRequest.metadata?.serviceType
      ) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PaymentProcessData,
          success: false,
          message:
            "Payment request is missing required invoice information. Please contact the sender.",
        };
      }

      // Check payment method compatibility
      if (
        paymentRequest.paymentMethod !== "both" &&
        paymentRequest.paymentMethod !== sanitizedPaymentMethod
      ) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PaymentProcessData,
          success: false,
          message: `This payment request only accepts ${paymentRequest.paymentMethod} payments`,
        };
      }

      // Verify PIN and get decrypted private key
      const pinResult = await PinHelper.getDecryptedPrivateKey(
        userWithSensitiveData.toObject(),
        sanitizedPinCode
      );

      if (!pinResult.success) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as PaymentProcessData,
          success: false,
          message: pinResult.error || "PIN verification failed",
        };
      }

      // Update payment request status and mark PIN as verified
      paymentRequest.status = PaymentRequestStatus.PROCESSING;
      paymentRequest.pinVerified = true;
      await paymentRequest.save({ session });

      // Process payment based on method
      let blockchainTxHash: string | undefined;
      let fiatPaymentRef: string | undefined;

      if (sanitizedPaymentMethod === "crypto") {
        // Process crypto payment
        const blockchain = BlockchainFactory.getTransactionProvider("stellar");

        const paymentParams: any = {
          user: {
            ...userWithSensitiveData.toObject(),
            privateKey: pinResult.decryptedPrivateKey,
          },
          assetCode:
            paymentRequest.currency === "XLM"
              ? "NATIVE"
              : paymentRequest.currency,
          address: paymentRequest.fromUser.stellarPublicKey,
          amount: paymentRequest.amount.toString(),
          transactionDetails:
            sanitizedTransactionDetails ||
            `Payment request: ${paymentRequest.requestId}, Invoice: ${paymentRequest.metadata?.invoiceNumber}`,
        };

        const paymentResult = await blockchain.payment(paymentParams);
        blockchainTxHash = paymentResult.data.hash;

        // Store only the hash in payment request
        paymentRequest.blockchainTxHash = blockchainTxHash;
      } else if (sanitizedPaymentMethod === "fiat") {
        // Process fiat payment (placeholder)
        fiatPaymentRef = `fiat_${nanoid(16)}`;
        paymentRequest.fiatPaymentRef = fiatPaymentRef;

        // TODO: Integrate with your actual fiat payment provider
        console.log(
          `Fiat payment would be processed for ${paymentRequest.amount} ${paymentRequest.currency}`
        );
      }

      // Update payment request status to completed
      paymentRequest.status = PaymentRequestStatus.COMPLETED;

      // Add payment completion timestamp to metadata
      paymentRequest.metadata = {
        ...paymentRequest.metadata,
        paymentCompletedDate: new Date().toISOString(),
        paymentMethodUsed: sanitizedPaymentMethod,
        transactionReference: blockchainTxHash || fiatPaymentRef,
      };

      await paymentRequest.save({ session });

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      // Emit notification events
      await Promise.all([
        emitEvent("payment:request:completed", {
          requestId: paymentRequest.requestId,
          fromUser: paymentRequest.fromUser._id,
          toUser: paymentRequest.toUser._id,
          amount: paymentRequest.amount,
          currency: paymentRequest.currency,
          blockchainTxHash,
          fiatPaymentRef,
          invoiceNumber: paymentRequest.metadata?.invoiceNumber,
          serviceType: paymentRequest.metadata?.serviceType,
        }).catch((err) =>
          console.error("Error emitting payment completed event:", err)
        ),

        emitEvent("send:notification", {
          userId: paymentRequest.fromUser._id,
          type: "payment_request_completed",
          title: "Payment Request Completed",
          message: `Your payment request for ${paymentRequest.amount} ${paymentRequest.currency} (Invoice: ${paymentRequest.metadata?.invoiceNumber}) has been paid`,
          data: {
            requestId: paymentRequest.requestId,
            amount: paymentRequest.amount,
            currency: paymentRequest.currency,
            invoiceNumber: paymentRequest.metadata?.invoiceNumber,
            txHash: blockchainTxHash,
            paymentRef: fiatPaymentRef,
          },
        }).catch((err) =>
          console.error("Error emitting notification event:", err)
        ),
      ]);

      return {
        status: httpStatus.OK,
        data: {
          blockchainTxHash,
          fiatPaymentRef,
          paymentRequest: {
            id: paymentRequest._id.toString(),
            requestId: paymentRequest.requestId,
            status: paymentRequest.status,
            amount: paymentRequest.amount,
            currency: paymentRequest.currency,
          },
        },
        success: true,
        message: "Payment processed successfully",
      };
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();

      console.error("Error processing payment request:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PaymentProcessData,
          success: false,
          message: `${errorMessages}`,
        };
      }

      // Handle payment processing errors
      if (
        error.message?.includes("Insufficient balance") ||
        error.message?.includes("Payment failed")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PaymentProcessData,
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as PaymentProcessData,
        success: false,
        message: "Error processing payment request",
      };
    }
  }

  async cancelPaymentRequest(
    req: Request
  ): Promise<ServiceResponse<CancelRequestData>> {
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
          data: {} as CancelRequestData,
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
          data: {} as CancelRequestData,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate request body with Zod
      const validatedBody = CancelPaymentRequestSchema.parse(req.body);

      // SECURITY: Sanitize all inputs
      const sanitizedRequestId = sanitizeInput(validatedBody.requestId);
      const sanitizedReason = validatedBody.reason
        ? sanitizeInput(validatedBody.reason)
        : undefined;

      // Get user for PIN verification (if needed for cancellation)
      const userWithSensitiveData = await User.findById(user._id)
        .select("+password +encryptedPrivateKey +pinCode")
        .session(session);

      if (!userWithSensitiveData) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as CancelRequestData,
          success: false,
          message: "User not found",
        };
      }

      // Find payment request
      const paymentRequest = await PaymentRequest.findOne({
        requestId: sanitizedRequestId,
      }).session(session);

      if (!paymentRequest) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as CancelRequestData,
          success: false,
          message: "Payment request not found",
        };
      }

      // SECURITY: Check if user is authorized to cancel
      const fromUserId = paymentRequest.fromUser.toString();
      const userId = user._id.toString();

      if (fromUserId !== userId) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.FORBIDDEN,
          data: {} as CancelRequestData,
          success: false,
          message: "Only the creator can cancel this payment request",
        };
      }

      // Check if request can be cancelled
      if (paymentRequest.status !== PaymentRequestStatus.PENDING) {
        await session.abortTransaction();
        session.endSession();
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as CancelRequestData,
          success: false,
          message: `Cannot cancel payment request with status: ${paymentRequest.status}`,
        };
      }

      // Update status
      paymentRequest.status = PaymentRequestStatus.CANCELLED;
      if (sanitizedReason) {
        paymentRequest.metadata = {
          ...paymentRequest.metadata,
          cancellationReason: sanitizedReason,
        };
      }
      await paymentRequest.save({ session });

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      // Emit notification event
      await emitEvent("payment:request:cancelled", {
        requestId: paymentRequest.requestId,
        fromUser: paymentRequest.fromUser,
        toUser: paymentRequest.toUser,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        reason: sanitizedReason,
      }).catch((err) =>
        console.error("Error emitting payment cancelled event:", err)
      );

      return {
        status: httpStatus.OK,
        data: { success: true },
        success: true,
        message: "Payment request cancelled successfully",
      };
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();

      console.error("Error cancelling payment request:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as CancelRequestData,
          success: false,
          message: `${errorMessages}`,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as CancelRequestData,
        success: false,
        message: "Error cancelling payment request",
      };
    }
  }

  async generatePaymentQRCode(
    req: Request
  ): Promise<ServiceResponse<QRCodeData>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as QRCodeData,
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as QRCodeData,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate request body with Zod
      const validatedBody = GenerateQRCodeSchema.parse(req.body);

      // SECURITY: Sanitize all inputs
      const sanitizedRequestId = sanitizeInput(validatedBody.requestId);
      const sanitizedSize = parseInt(
        sanitizeInput(validatedBody.size.toString()),
        10
      );

      // Find payment request
      const paymentRequest = await PaymentRequest.findOne({
        requestId: sanitizedRequestId,
      })
        .populate("fromUser", "_id")
        .lean();

      if (!paymentRequest) {
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as QRCodeData,
          success: false,
          message: "Payment request not found",
        };
      }

      // SECURITY: Check if user is authorized
      const fromUserId = paymentRequest.fromUser._id.toString();
      const userId = user._id.toString();

      if (fromUserId !== userId) {
        return {
          status: httpStatus.FORBIDDEN,
          data: {} as QRCodeData,
          success: false,
          message:
            "Not authorized to generate QR code for this payment request",
        };
      }

      // Generate QR code
      const qrCode = await QRCode.toDataURL(paymentRequest.paymentLink, {
        width: sanitizedSize,
        margin: 2,
      });

      return {
        status: httpStatus.OK,
        data: {
          qrCode,
          qrCodeUrl: paymentRequest.qrCodeUrl,
          paymentLink: paymentRequest.paymentLink,
          shortUrl: paymentRequest.shortUrl,
        },
        success: true,
        message: "QR code generated successfully",
      };
    } catch (error: any) {
      console.error("Error generating QR code:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as QRCodeData,
          success: false,
          message: `${errorMessages}`,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as QRCodeData,
        success: false,
        message: "Error generating QR code",
      };
    }
  }

  async validatePaymentLink(
    req: Request
  ): Promise<ServiceResponse<LinkValidationData>> {
    try {
      // SECURITY: Validate request body with Zod
      const validatedBody = ValidatePaymentLinkSchema.parse(req.body);

      // SECURITY: Sanitize link ID
      const sanitizedLinkId = sanitizeInput(validatedBody.linkId);

      // Find payment request by link ID
      const paymentRequest: any = await PaymentRequest.findOne({
        linkId: sanitizedLinkId,
      })
        .populate("fromUser", "username primaryEmail userProfileUrl")
        .populate("toUser", "username primaryEmail userProfileUrl")
        .lean();

      if (!paymentRequest) {
        return {
          status: httpStatus.NOT_FOUND,
          data: { isValid: false, error: "Payment link not found" },
          success: true,
          message: "Link validation completed",
        };
      }

      // Check if request has expired
      if (paymentRequest.expiresAt && new Date() > paymentRequest.expiresAt) {
        return {
          status: httpStatus.OK,
          data: {
            isValid: false,
            paymentRequest,
            error: "Payment request has expired",
          },
          success: true,
          message: "Link validation completed",
        };
      }

      // Check if request is already processed/cancelled
      if (paymentRequest.status !== PaymentRequestStatus.PENDING) {
        return {
          status: httpStatus.OK,
          data: {
            isValid: false,
            paymentRequest,
            error: `Payment request is ${paymentRequest.status}`,
          },
          success: true,
          message: "Link validation completed",
        };
      }

      return {
        status: httpStatus.OK,
        data: {
          isValid: true,
          paymentRequest,
        },
        success: true,
        message: "Payment link is valid",
      };
    } catch (error: any) {
      console.error("Error validating payment link:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: { isValid: false, error: errorMessages },
          success: false,
          message: `${errorMessages}`,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: { isValid: false, error: "Validation failed" },
        success: false,
        message: "Error validating payment link",
      };
    }
  }

  // Helper Methods
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
export const paymentRequestService = new PaymentRequestService();
