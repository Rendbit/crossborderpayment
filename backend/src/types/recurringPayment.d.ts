import { Request as ExpressRequest } from "express";
import mongoose, { Document, Types } from "mongoose";
import { ServiceResponse } from "./response";
import { PaymentRequestUser } from "./paymentRequest";


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
