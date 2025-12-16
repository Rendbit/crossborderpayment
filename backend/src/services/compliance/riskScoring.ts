import { User } from "../../models/User";
import { COMPLIANCE_CONFIG } from "../../common/constants/compliance";
import { KycTier } from "../../common/enums/kyc";
import { UnusualPattern } from "../../types/compliance";
import { DepositRisk } from "../../models/depositRisk";

export class RiskScoringService {
  /**
   * Calculate smart risk score (0-100)
   * Lower score = lower risk
   */
  async calculateRiskScore(userId: string): Promise<{
    score: number;
    level: "LOW" | "MEDIUM" | "HIGH";
    factors: {
      depositFrequency: number;
      depositSize: number;
      tierCompliance: number;
      amlRisk: number;
    };
  }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Calculate individual factors (0-100 each)
    const depositFrequency = await this.calculateDepositFrequencyRisk(
      userId,
      user
    );
    const depositSize = await this.calculateDepositSizeRisk(userId, user);
    const tierCompliance = this.calculateTierComplianceRisk(user);
    const amlRisk = this.calculateAmlRisk(user);

    // Weighted average
    const score = Math.round(
      depositFrequency * 0.2 +
        depositSize * 0.3 +
        tierCompliance * 0.3 +
        amlRisk * 0.2
    );

    // Determine level
    let level: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    if (score >= 70) level = "HIGH";
    else if (score >= 40) level = "MEDIUM";

    return {
      score,
      level,
      factors: {
        depositFrequency,
        depositSize,
        tierCompliance,
        amlRisk,
      },
    };
  }

  private async calculateDepositFrequencyRisk(
    userId: string,
    user: any
  ): Promise<number> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentDeposits = await DepositRisk.countDocuments({
      userId,
      createdAt: { $gte: sevenDaysAgo },
    });

    // Normalize to 0-100 scale
    // 0-5 deposits = low risk (0-30)
    // 6-15 deposits = medium risk (31-60)
    // 16+ deposits = high risk (61-100)
    if (recentDeposits <= 5) return 30;
    if (recentDeposits <= 15) return 60;
    return 100;
  }

  private async calculateDepositSizeRisk(
    userId: string,
    user: any
  ): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentDeposits = await DepositRisk.find({
      userId,
      createdAt: { $gte: thirtyDaysAgo },
    });

    const totalAmount = recentDeposits.reduce(
      (sum, deposit) => sum + deposit.amount,
      0
    );
    const tierLimits =
      COMPLIANCE_CONFIG.VELOCITY_LIMITS[user.kycTier as KycTier];
    const tierLimit = tierLimits.monthlyLimit;

    // Percentage of monthly limit used
    const percentage = (totalAmount / tierLimit) * 100;

    // Normalize to 0-100 risk score
    if (percentage <= 30) return 20; // Low risk
    if (percentage <= 70) return 50; // Medium risk
    if (percentage <= 120) return 80; // High risk
    return 100; // Very high risk
  }

  private calculateTierComplianceRisk(user: any): number {
    // Check if user activity matches their tier
    if (user.kycTier === KycTier.STANDARD) return 0; // Standard tier can do anything

    if (user.kycTier === KycTier.BASIC) {
      // Basic tier users doing high volume
      if (user.totalDeposits > 50000) return 70; // Might need Standard
      return 30; // OK for Basic
    }

    // Tier 0 users
    if (user.totalDeposits > 10000) return 80; // Might need Basic
    return 40; // OK for Tier 0
  }

  private calculateAmlRisk(user: any): number {
    if (!user.amlRiskScore) return 0;

    if (user.amlRiskScore >= 70) return 100;
    if (user.amlRiskScore >= 40) return 60;
    if (user.amlRiskScore >= 20) return 30;
    return 0;
  }

  /**
   * Detect unusual patterns without being too restrictive
   */
  async detectUnusualPatterns(userId: string): Promise<{
    hasUnusualPatterns: boolean;
    patterns: UnusualPattern[];
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deposits = await DepositRisk.find({
      userId,
      createdAt: { $gte: thirtyDaysAgo },
    }).sort({ createdAt: 1 });

    if (deposits.length < 3) {
      return { hasUnusualPatterns: false, patterns: [] };
    }

    const patterns: UnusualPattern[] = [];

    // Pattern 1: Rapid consecutive deposits
    const rapidPattern = this.detectRapidDeposits(deposits);
    if (rapidPattern.detected) {
      patterns.push({
        type: "RAPID_DEPOSITS",
        confidence: rapidPattern.confidence,
        description: "Multiple deposits in short timeframe",
        action: rapidPattern.confidence > 70 ? "SUGGEST" : "MONITOR",
      });
    }

    // Pattern 2: Round number deposits (structuring)
    const roundNumberPattern = this.detectRoundNumbers(deposits);
    if (roundNumberPattern.detected) {
      patterns.push({
        type: "ROUND_NUMBERS",
        confidence: roundNumberPattern.confidence,
        description: "Multiple round number deposits",
        action: "REVIEW",
      });
    }

    // Pattern 3: Business-like pattern (regular, consistent)
    const businessPattern = this.detectBusinessPattern(deposits);
    if (businessPattern.detected) {
      patterns.push({
        type: "BUSINESS_PATTERN",
        confidence: businessPattern.confidence,
        description: "Regular deposit pattern detected",
        action: "MONITOR", // This is actually good
      });
    }

    return {
      hasUnusualPatterns:
        patterns.filter((p) => p.type !== "BUSINESS_PATTERN").length > 0,
      patterns,
    };
  }

  private detectRapidDeposits(deposits: any[]) {
    if (deposits.length < 4) return { detected: false, confidence: 0 };

    // Check for 3+ deposits within 6 hours
    let rapidCount = 0;
    for (let i = 2; i < deposits.length; i++) {
      const timeDiff =
        deposits[i].createdAt.getTime() - deposits[i - 2].createdAt.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (hoursDiff <= 6) {
        rapidCount++;
      }
    }

    const confidence = Math.min(100, (rapidCount / deposits.length) * 100);

    return {
      detected: confidence > 50,
      confidence,
      count: rapidCount,
    };
  }

  private detectRoundNumbers(deposits: any[]) {
    const roundNumbers = deposits.filter((deposit) => {
      const amount = deposit.amount;
      // Check if amount ends with .00 or is divisible by 1000
      return amount % 1000 === 0 || amount % 500 === 0;
    });

    const confidence = (roundNumbers.length / deposits.length) * 100;

    return {
      detected: confidence > 60,
      confidence,
      count: roundNumbers.length,
    };
  }

  private detectBusinessPattern(deposits: any[]) {
    if (deposits.length < 5) return { detected: false, confidence: 0 };

    const amounts = deposits.map((d) => d.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    // Calculate consistency (lower variance = more business-like)
    const variance =
      amounts.reduce((sum, amount) => {
        return sum + Math.pow(amount - avgAmount, 2);
      }, 0) / amounts.length;

    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = (stdDev / avgAmount) * 100;

    // Very consistent amounts (like salary deposits)
    const confidence = Math.max(0, 100 - coefficientOfVariation);

    return {
      detected: coefficientOfVariation < 40, // Less than 40% variation
      confidence,
      isConsistent: coefficientOfVariation < 20,
    };
  }

 /**
   * Smart decision on whether to request verification
   */
  async shouldRequestVerification(userId: string): Promise<{
    shouldRequest: boolean;
    type: 'NONE' | 'LIGHT' | 'STANDARD';
    reason: string;
    suggestions: string[];
  }> {
    const user = await User.findById(userId);
    if (!user) {
      return {
        shouldRequest: false,
        type: 'NONE',
        reason: 'User not found',
        suggestions: []
      };
    }

    const riskScore = await this.calculateRiskScore(userId);
    const unusualPatterns = await this.detectUnusualPatterns(userId);

    // Decision logic
    if (riskScore.level === 'HIGH' && riskScore.score > 80) {
      return {
        shouldRequest: true,
        type: 'STANDARD',
        reason: 'High risk score detected',
        suggestions: ['Complete ID verification', 'Provide proof of address']
      };
    } else if (unusualPatterns.hasUnusualPatterns) {
      const hasSuspiciousPatterns = unusualPatterns.patterns.some(p => 
        p.type === 'ROUND_NUMBERS' && p.confidence > 70
      );
      
      if (hasSuspiciousPatterns) {
        return {
          shouldRequest: true,
          type: 'STANDARD',
          reason: 'Suspicious deposit pattern detected',
          suggestions: ['Complete verification', 'Contact support if needed']
        };
      }
      
      // For less suspicious patterns, just light verification
      return {
        shouldRequest: true,
        type: 'LIGHT',
        reason: 'Unusual activity pattern',
        suggestions: ['Verify phone number', 'Confirm email address']
      };
    } else if (user.kycTier === KycTier.NONE && user.totalDeposits > 10000) {
      // Tier 0 user doing decent volume
      return {
        shouldRequest: false, // Don't require, just suggest
        type: 'NONE',
        reason: 'Consider upgrading for better limits',
        suggestions: ['Upgrade to Basic KYC for higher limits']
      };
    }

    return {
      shouldRequest: false,
      type: 'NONE',
      reason: 'Normal activity patterns',
      suggestions: ['Continue using the platform']
    };
  }
}
