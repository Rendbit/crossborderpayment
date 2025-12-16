import { Request as ExpressRequest } from "express";
import mongoose, { Document, Types } from "mongoose";
import { ServiceResponse } from "./response";

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

export enum PaymentMethod {
  CRYPTO = "crypto",
  FIAT = "fiat",
  BOTH = "both",
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
