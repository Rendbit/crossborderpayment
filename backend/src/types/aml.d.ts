export interface AMLCheckResult {
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  isSanctioned: boolean;
  riskCategories: string[];
  provider: string;
  metadata?: Record<string, any>;
}

export interface AMLProvider {
  name: string;
  checkAddress(address: string, amount?: number): Promise<AMLCheckResult>;
  checkTransaction(txHash: string): Promise<AMLCheckResult>;
}
