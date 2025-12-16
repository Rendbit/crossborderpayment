import { Document, Types } from "mongoose";
import { TransactionType, RiskLevel } from "../common/enums/transaction";

export interface IDepositRisk extends Document {
  userId: Types.ObjectId;
  amount: number;
  txId: string;
  transactionType: TransactionType;
  currency: string;
  cryptoAddress?: string;
  fiatAccountId?: string;
  riskLevel: RiskLevel;
  flagged: boolean;
  flagReason?: string;
  reasonRequested: boolean;
  sourceOfFundsProvided: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
