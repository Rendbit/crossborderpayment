import mongoose, { Schema } from "mongoose";
import { IRecurringPayment } from "../types/recurringPayment";

const RecurringPaymentSchema: Schema = new Schema(
  {
    scheduleId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fromUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    toUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "bi_weekly", "monthly", "quarterly", "yearly"],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      index: true,
    },
    nextPaymentDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "paused", "cancelled", "completed"],
      default: "active",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["crypto", "fiat", "both"],
      default: "both",
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    lastProcessedAt: {
      type: Date,
    },
    pinVerified: {
      type: Boolean,
      default: false,
    },
    blockchainTxHashes: {
      type: [String],
      default: [],
    },
    fiatPaymentRefs: {
      type: [String],
      default: [],
    },
    processingAttempts: {
      type: Number,
      default: 0,
    },
    lastProcessingError: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
RecurringPaymentSchema.index({ nextPaymentDate: 1, status: 1 });
RecurringPaymentSchema.index({ status: 1, nextPaymentDate: 1 });
RecurringPaymentSchema.index({ fromUser: 1, status: 1 });
RecurringPaymentSchema.index({ toUser: 1, status: 1 });

// Critical index for batch processing - ONLY queries active payments with nextPaymentDate <= now
RecurringPaymentSchema.index(
  { status: 1, nextPaymentDate: 1, pinVerified: 1 },
  {
    name: "due_payments_for_processing",
    background: true,
    partialFilterExpression: {
      status: "active",
      pinVerified: true,
    },
  }
);

// For retries
RecurringPaymentSchema.index(
  { "metadata.retryAt": 1, status: 1 },
  {
    name: "retry_payments",
    background: true,
    partialFilterExpression: {
      status: "active",
      "metadata.retryAt": { $exists: true },
    },
  }
);

export const RecurringPayment = mongoose.model<IRecurringPayment>(
  "RecurringPayment",
  RecurringPaymentSchema
);
