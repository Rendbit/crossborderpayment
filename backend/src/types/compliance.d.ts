import { Types } from "mongoose";
import {
  RiskLevel,
  ComplianceAction,
  TransactionType,
} from "../common/enums/transaction";

export interface IComplianceLog {
  userId: Types.ObjectId;
  action: ComplianceAction;
  amount?: number;
  txId?: string;
  riskLevel?: RiskLevel;
  reason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface VelocityCheckResult {
  allowed: boolean;
  reason?: string;
  limits?: {
    tier: number;
    transactionType: TransactionType;
    singleLimit: number;
    dailyLimit: number;
    weeklyLimit: number;
    monthlyLimit: number;
    dailyUsed: number;
    weeklyUsed: number;
    monthlyUsed: number;
    dailyRemaining: number;
    weeklyRemaining: number;
    monthlyRemaining: number;
    allowedTypes: TransactionType[];
  };
}

export interface RiskScore {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH";
  factors: {
    depositFrequency: number;
    depositSize: number;
    tierCompliance: number;
    amlRisk: number;
  };
}

export interface AMLCheckResult {
  riskScore: number;
  riskLevel: RiskLevel;
  isSanctioned: boolean;
  riskCategories: string[];
  provider: string;
  metadata?: Record<string, any>;
}

export interface UnusualPattern {
  type: string;
  confidence: number;
  description: string;
  action: "MONITOR" | "SUGGEST" | "REVIEW";
}
