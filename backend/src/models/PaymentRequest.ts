import mongoose, { Schema } from "mongoose";
import { IPaymentRequest } from "../types/paymentRequest";

const PaymentRequestSchema: Schema = new Schema(
  {
    requestId: {
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
    expiresAt: {
      type: Date,
      index: true,
      expires: 0,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "completed",
        "rejected",
        "cancelled",
        "expired",
        "failed",
      ],
      default: "pending",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["crypto", "fiat", "both"],
      default: "both",
    },
    metadata: {
      invoiceNumber: { type: String, required: true },
      invoiceDateAndTime: { type: Date, required: true },
    },
    qrCodeUrl: {
      type: String,
      required: true,
    },
    paymentLink: {
      type: String,
      required: true,
    },
    shortUrl: {
      type: String,
    },
    linkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    pinVerified: {
      type: Boolean,
      default: false,
    },
    blockchainTxHash: {
      type: String,
      index: true,
    },
    fiatPaymentRef: {
      type: String,
      index: true,
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

// Index for efficient queries
PaymentRequestSchema.index({ fromUser: 1, status: 1, createdAt: -1 });
PaymentRequestSchema.index({ toUser: 1, status: 1, createdAt: -1 });
PaymentRequestSchema.index({ linkId: 1 }, { unique: true });
PaymentRequestSchema.index({ blockchainTxHash: 1 }, { sparse: true });
PaymentRequestSchema.index({ fiatPaymentRef: 1 }, { sparse: true });

export const PaymentRequest = mongoose.model<IPaymentRequest>(
  "PaymentRequest",
  PaymentRequestSchema
);
