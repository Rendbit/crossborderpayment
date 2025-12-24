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
      enum: [
        "hourly",
        "daily",
        "weekly",
        "bi_weekly",
        "monthly",
        "quarterly",
        "yearly",
        "custom",
      ],
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
      // Schedule window for hourly/custom payments
      scheduleWindow: {
        startHour: { type: Number, min: 0, max: 23, default: 0 },
        endHour: { type: Number, min: 0, max: 23, default: 23 },
        timezone: { type: String, default: "UTC" },
      },
      // For hourly payments
      hourlyInterval: { type: Number, min: 1, max: 24, default: 1 },
      // For custom frequency
      customInterval: { type: Number, min: 1 }, // in days
      customTimes: [{ type: String }], // Array of specific times in 24-hour format ["09:00", "14:00"]
      customFullDatetimes: [{ type: String }], // Array of ISO datetime strings for custom frequency
      // NEW: Frontend 12-hour format support
      scheduleTimes: [{ type: String }], // Array of times in 12-hour format ["9:00 AM", "2:30 PM"] - For Daily, Weekly, Monthly, Yearly
      specificHours: [{ type: String }], // Array of hours in 12-hour format ["9:00 AM", "6:00 PM"] - For Hourly frequency display
      // NEW: Custom datetimes in 12-hour format for frontend display
      customDatetimes: [
        {
          date: { type: Date },
          time12h: { type: String },
        },
      ],
      timezone: { type: String, default: "UTC" },
      // Exclusions
      excludedDays: { type: [Number], default: [0, 6] }, // 0=Sunday, 6=Saturday
      excludedHours: { type: [Number], default: [] }, // Array of hours to exclude (0-23)
      excludedDates: { type: [Date], default: [] }, // Specific dates to exclude
      // Backward compatibility
      skipWeekends: { type: Boolean, default: true },
      // Pause settings
      pauseEnabled: { type: Boolean, default: false },
      pauseStartDate: { type: Date },
      pauseEndDate: { type: Date },
      pauseReason: { type: String },
      // Tracking
      lastProcessedAmount: { type: Number },
      lastProcessedCurrency: { type: String },
      lastProcessedDate: { type: Date },
      totalProcessedCount: { type: Number, default: 0 },
      failedCount: { type: Number, default: 0 },
      lastFailedAttempt: { type: Date },
      failureReason: { type: String },
      skipCount: { type: Number, default: 0 },
      weekendSkipCount: { type: Number, default: 0 },
      windowSkipCount: { type: Number, default: 0 },
      exclusionSkipCount: { type: Number, default: 0 },
      lastSkippedDueToWeekend: { type: Date },
      lastSkippedDueToWindow: { type: Date },
      lastSkippedDueToExclusion: { type: Date },
      lastSkipReason: { type: String },
      // Retry logic
      retryAt: { type: Date },
      retryCount: { type: Number, default: 0 },
      maxRetries: { type: Number, default: 3 },
      // Payment tracking
      lastBlockchainTxHash: { type: String },
      lastFiatPaymentRef: { type: String },
      // Pause tracking
      lastPausedAt: { type: Date },
      lastResumedAt: { type: Date },
      // Cancellation tracking
      cancellationReason: { type: String },
      cancelledBy: { type: String, enum: ["sender", "receiver"] },
      cancelledAt: { type: Date },
      wasPaused: { type: Boolean },
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

// Index for schedule window queries
RecurringPaymentSchema.index(
  {
    "metadata.scheduleWindow.startHour": 1,
    "metadata.scheduleWindow.endHour": 1,
  },
  { background: true }
);

export const RecurringPayment = mongoose.model<IRecurringPayment>(
  "RecurringPayment",
  RecurringPaymentSchema
);
