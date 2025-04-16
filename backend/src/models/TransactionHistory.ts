const mongoose = require("mongoose");
const { Schema } = mongoose;

const transactionHistorySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    txHash: {
      type: String,
      required: true,
    },
    transactionDetail: {
      type: Map,
      of: Schema.Types.Mixed,
      required: true,
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

export const TransactionHistory = mongoose.model(
  "TransactionHistory",
  transactionHistorySchema
);
