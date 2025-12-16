import { Schema, model } from "mongoose";
import { IComplianceLog } from "../types/compliance";
import { ComplianceAction, RiskLevel } from "../common/enums/transaction";

const ComplianceLogSchema = new Schema<IComplianceLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: {
      type: String,
      enum: Object.values(ComplianceAction),
      required: true,
    },
    amount: { type: Number },
    txId: { type: String },
    riskLevel: { type: String, enum: Object.values(RiskLevel) },
    reason: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

ComplianceLogSchema.index({ userId: 1, createdAt: -1 });
ComplianceLogSchema.index({ action: 1 });

export const ComplianceLog = model<IComplianceLog>(
  "ComplianceLog",
  ComplianceLogSchema
);
