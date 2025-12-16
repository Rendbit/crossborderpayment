import { Schema, model } from "mongoose";
import { IDepositRisk } from "../types/depositRisk";
import { TransactionType, RiskLevel } from "../common/enums/transaction";

const DepositRiskSchema = new Schema<IDepositRisk>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    txId: { type: String, required: true, unique: true },
    transactionType: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
    },
    currency: { type: String, required: true, default: "USD" },
    cryptoAddress: { type: String },
    fiatAccountId: { type: String },
    riskLevel: {
      type: String,
      enum: Object.values(RiskLevel),
      default: RiskLevel.LOW,
    },
    flagged: { type: Boolean, default: false },
    flagReason: { type: String },
    reasonRequested: { type: Boolean, default: false },
    sourceOfFundsProvided: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
DepositRiskSchema.index({ userId: 1, createdAt: -1 });
DepositRiskSchema.index({ flagged: 1 });
DepositRiskSchema.index({ riskLevel: 1 });
DepositRiskSchema.index({ transactionType: 1 });

export const DepositRisk = model<IDepositRisk>(
  "DepositRisk",
  DepositRiskSchema
);
