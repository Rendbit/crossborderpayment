import { User } from '../../models/User';
import { ComplianceLog } from '../../models/ComplianceLog';
import { COMPLIANCE_CONFIG } from '../../common/constants/compliance';
import { ComplianceAction } from '../../common/enums/transaction';
import { KycTier } from '../../common/enums/kyc';
import { VerificationType } from '../../common/enums/user';
import { RiskScoringService } from './riskScoring';
import { DepositRisk } from '../../models/depositRisk';

export class SmartVerificationService {
  private riskScoring: RiskScoringService;

  constructor() {
    this.riskScoring = new RiskScoringService();
  }

  /**
   * Smart source of funds check
   */
  async checkSourceOfFunds(userId: string): Promise<{
    required: boolean;
    reason?: string;
    suggestedDocuments: string[];
    deadlineDays?: number;
  }> {
    const user = await User.findById(userId);
    if (!user) {
      return {
        required: false,
        suggestedDocuments: []
      };
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentDeposits = await DepositRisk.find({
      userId,
      createdAt: { $gte: thirtyDaysAgo }
    });

    const total30Days = recentDeposits.reduce((sum, d) => sum + d.amount, 0);
    const tierThreshold = COMPLIANCE_CONFIG.SMART_THRESHOLDS.SOURCE_OF_FUNDS[user.kycTier as KycTier];

    // Smart decision making
    if (total30Days > tierThreshold * 3) {
      // Very high volume for tier
      return {
        required: true,
        reason: `30-day volume ($${total30Days}) significantly exceeds typical tier usage`,
        suggestedDocuments: ['bank_statements', 'pay_slips', 'tax_returns'],
        deadlineDays: 14
      };
    } else if (total30Days > tierThreshold) {
      // High volume, suggest but don't require
      return {
        required: false,
        reason: `Consider providing source of funds for volumes above $${tierThreshold}`,
        suggestedDocuments: ['bank_statements', 'income_proof']
      };
    } else if (recentDeposits.length >= 10 && total30Days > 5000) {
      // Many small deposits
      return {
        required: false,
        reason: 'Frequent deposit pattern detected',
        suggestedDocuments: ['bank_statements']
      };
    }

    return {
      required: false,
      suggestedDocuments: []
    };
  }

  /**
   * Suggest appropriate KYC tier based on activity
   */
  async suggestAppropriateTier(userId: string): Promise<{
    currentTier: KycTier;
    suggestedTier: KycTier;
    reasons: string[];
    benefits: string[];
  }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentDeposits = await DepositRisk.find({
      userId,
      createdAt: { $gte: thirtyDaysAgo }
    });

    const total30Days = recentDeposits.reduce((sum, d) => sum + d.amount, 0);
    const depositCount = recentDeposits.length;

    let suggestedTier = user.kycTier;
    const reasons: string[] = [];
    const benefits: string[] = [];

    // Suggest Basic KYC if Tier 0 and decent activity
    if (user.kycTier === KycTier.NONE) {
      if (total30Days > 5000 || depositCount >= 5) {
        suggestedTier = KycTier.BASIC;
        reasons.push('Your deposit activity suggests you would benefit from Basic verification');
        benefits.push('Higher daily limits ($25,000)', 'Fiat deposit/withdrawal capabilities');
      }
    }

    // Suggest Standard KYC if Basic and high activity
    if (user.kycTier === KycTier.BASIC && suggestedTier === KycTier.BASIC) {
      if (total30Days > 50000 || depositCount >= 20) {
        suggestedTier = KycTier.STANDARD;
        reasons.push('Your high-volume activity suggests Standard verification');
        benefits.push('Highest limits ($100,000 daily)', 'All transaction types available');
      }
    }

    // If already at appropriate tier
    if (suggestedTier === user.kycTier) {
      reasons.push('Your current tier appears appropriate for your activity level');
    }

    return {
      currentTier: user.kycTier,
      suggestedTier,
      reasons,
      benefits
    };
  }

  /**
   * Handle customer-friendly verification requests
   */
  async requestVerification(userId: string, type: 'LIGHT' | 'STANDARD'): Promise<{
    success: boolean;
    verificationType: string;
    requirements: string[];
    allowedDuringVerification: {
      canDeposit: boolean;
      canWithdraw: boolean;
      maxAmount: number;
    };
    message: string;
  }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const requirements = type === 'LIGHT' 
      ? ['phone_verification', 'email_confirmation']
      : ['id_document', 'selfie', 'proof_of_address'];

    // FIXED: Use correct VerificationType enum values
    const verificationType: VerificationType = type === 'LIGHT' 
      ? VerificationType.PHONE 
      : VerificationType.DOCUMENTS;

    // Set user status
    await User.findByIdAndUpdate(userId, {
      pendingVerification: verificationType,
      verificationRequestedAt: new Date()
    });

    // Log the request
    await ComplianceLog.create({
      userId,
      action: ComplianceAction.VERIFICATION_REQUESTED,
      metadata: {
        verificationType: type,
        requirements,
        timestamp: new Date().toISOString()
      }
    } as any);

    // Customer-friendly messaging
    const message = type === 'LIGHT'
      ? 'To enhance your account security and increase limits, please verify your contact information. You can continue trading during verification.'
      : 'To access higher limits and all features, please complete identity verification. Limited functionality available during verification.';

    return {
      success: true,
      verificationType: type,
      requirements,
      allowedDuringVerification: {
        canDeposit: true,
        canWithdraw: type === 'LIGHT',
        maxAmount: type === 'LIGHT' ? 5000 : 1000
      },
      message
    };
  }

  /**
   * Complete verification
   */
  async completeVerification(userId: string, documents: any[]): Promise<{
    success: boolean;
    newTier?: KycTier;
    newLimits: any;
    message: string;
  }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    let newTier = user.kycTier;
    
    // FIXED: Compare with VerificationType enum values
    if (user.pendingVerification === VerificationType.DOCUMENTS) {
      newTier = KycTier.STANDARD;
    } else if (user.pendingVerification === VerificationType.PHONE && user.kycTier === KycTier.NONE) {
      newTier = KycTier.BASIC;
    }

    // Update user
    await User.findByIdAndUpdate(userId, {
      kycTier: newTier,
      kycStatus: 'approved',
      pendingVerification: undefined,
      kycVerifiedAt: new Date()
    });

    // Log completion
    await ComplianceLog.create({
      userId,
      action: ComplianceAction.TIER_UPGRADED,
      metadata: {
        fromTier: user.kycTier,
        toTier: newTier,
        timestamp: new Date().toISOString()
      }
    } as any);

    const newLimits = COMPLIANCE_CONFIG.VELOCITY_LIMITS[newTier as KycTier];
    
    return {
      success: true,
      newTier,
      newLimits,
      message: `Verification complete! You now have access to ${newTier === 2 ? 'all features' : 'more features'} with higher limits.`
    };
  }
}