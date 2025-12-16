import axios from "axios";
import { COMPLIANCE_CONFIG } from "../../common/constants/compliance";
import { AMLCheckResult } from "../../types/aml";

export class AmlService {
  private providers = {
    chainalysis: this.checkChainalysis.bind(this),
    elliptic: this.checkElliptic.bind(this),
    mock: this.checkMock.bind(this),
  };

  async checkAddress(
    address: string,
    amount?: number,
    provider: string = "chainalysis"
  ): Promise<AMLCheckResult> {
    // Check if address is from whitelisted exchange
    const isWhitelisted = this.isWhitelistedAddress(address);
    if (isWhitelisted) {
      return {
        riskScore: 0,
        riskLevel: "low",
        isSanctioned: false,
        riskCategories: [],
        provider: "whitelist",
        metadata: { whitelisted: true, source: "known_exchange" },
      };
    }

    const checkMethod = this.providers[provider as keyof typeof this.providers];
    if (!checkMethod) {
      throw new Error(`AML provider ${provider} not supported`);
    }

    return checkMethod(address, amount);
  }

  private async checkChainalysis(
    address: string,
    amount?: number
  ): Promise<AMLCheckResult> {
    try {
      const apiKey = process.env.CHAINALYSIS_API_KEY;
      if (!apiKey) {
        console.warn("Chainalysis API key not configured, using mock check");
        return this.checkMock(address, amount);
      }

      const response = await axios.post(
        "https://api.chainalysis.com/v2/address-risk",
        {
          address,
          amount,
          currency: "USD",
        },
        {
          headers: {
            "API-Key": apiKey,
            "Content-Type": "application/json",
          },
          timeout: 5000,
        }
      );

      const data = response.data;
      const riskLevel = this.calculateRiskLevel(data.riskScore);

      return {
        riskScore: data.riskScore,
        riskLevel,
        isSanctioned: data.isSanctioned || false,
        riskCategories: data.riskCategories || [],
        provider: "chainalysis",
        metadata: data,
      };
    } catch (error) {
      console.error("Chainalysis check failed, falling back to mock:", error);
      return this.checkMock(address, amount);
    }
  }

  private async checkElliptic(
    address: string,
    amount?: number
  ): Promise<AMLCheckResult> {
    // Similar implementation for Elliptic
    return this.checkMock(address, amount);
  }

  private async checkMock(
    address: string,
    amount?: number
  ): Promise<AMLCheckResult> {
    // Mock check for development
    const riskScore = Math.random() * 100;
    const riskLevel = this.calculateRiskLevel(riskScore);

    return {
      riskScore,
      riskLevel,
      isSanctioned: false,
      riskCategories: ["mock_check"],
      provider: "mock",
      metadata: { address, amount, timestamp: new Date().toISOString() },
    };
  }

  private calculateRiskLevel(riskScore: number): "low" | "medium" | "high" {
    const { HIGH_RISK_THRESHOLD, MEDIUM_RISK_THRESHOLD } =
      COMPLIANCE_CONFIG.AML;

    if (riskScore >= HIGH_RISK_THRESHOLD) return "high";
    if (riskScore >= MEDIUM_RISK_THRESHOLD) return "medium";
    return "low";
  }

  private isWhitelistedAddress(address: string): boolean {
    // In production, you'd check against a database of known exchange addresses
    // For now, we'll just check if it looks like an exchange address
    const exchangePatterns = [
      /^0x[a-fA-F0-9]{40}$/, // Ethereum addresses
      /^bc1[a-zA-Z0-9]{39,59}$/, // Bitcoin SegWit
      /^G[A-Z0-9]{55}$/, // Stellar addresses
    ];

    return exchangePatterns.some((pattern) => pattern.test(address));
  }
}
