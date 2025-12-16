import { Document } from "mongoose";
import {
  UserRole,
  AccountStatus,
  VerificationType,
} from "../common/enums/user";
import { KycTier, KycStatus } from "../common/enums/kyc";
import { Request } from "express";
import { ServiceResponse } from "./response";
export interface IUser extends Document {
  secondaryEmail?: string;
  primaryEmail: string;
  password?: string;
  isPassword: boolean;
  pinCode?: string;
  userProfileUrl?: string;
  role: UserRole[];
  country?: string;
  xp: number;
  username: string;
  stellarPublicKey?: string;
  isEmailVerified: boolean;
  isSuspended: boolean;
  isCaptchaVerified: boolean;
  totalWalletBalance: number;
  encryptedPrivateKey?: string;
  spendableBalance: number;
  savingsBalance: number;
  referralCode: string;
  points: number;

  // KYC & Compliance Fields
  kycTier: KycTier;
  kycStatus: KycStatus;
  kycVerifiedAt?: Date;
  accountStatus: AccountStatus;
  pendingVerification?: VerificationType;

  // Risk & Limits
  amlRiskScore?: number;
  amlRiskLevel?: "low" | "medium" | "high";
  totalDeposits: number;
  totalWithdrawals: number;
  firstDepositDate?: Date;
  lastDepositDate?: Date;

  // Velocity tracking
  dailyLimitUsed: {
    fiatToCrypto: number;
    cryptoToFiat: number;
    cryptoToCrypto: number;
    fiatToFiat: number;
    [key: string]: number;
  };
  weeklyLimitUsed: {
    fiatToCrypto: number;
    cryptoToFiat: number;
    cryptoToCrypto: number;
    fiatToFiat: number;
    [key: string]: number;
  };
  monthlyLimitUsed: {
    fiatToCrypto: number;
    cryptoToFiat: number;
    cryptoToCrypto: number;
    fiatToFiat: number;
    [key: string]: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

export interface IUserService {
  getUserProfile(req: Request): Promise<ServiceResponse<UserProfileData>>;
  createPassword(req: Request): Promise<ServiceResponse<null>>;
  getUserReferrals(req: Request): Promise<ServiceResponse<ReferralsData>>;
  getReferralLeaderBoard(
    req: Request
  ): Promise<ServiceResponse<LeaderboardData>>;
  updateProfile(req: Request): Promise<ServiceResponse<UserProfileData>>;
  updateProfileImage(req: Request): Promise<ServiceResponse<UserProfileData>>;
  changePassword(req: Request): Promise<ServiceResponse<null>>;
  exportPrivateKey(req: Request): Promise<ServiceResponse<PrivateKeyData>>;
}

export interface UserProfileData {
  _id: string;
  username: string;
  primaryEmail: string;
  stellarPublicKey: string;
  userProfileUrl?: string;
  country?: string;
  xp: number;
  isPassword: boolean;
  isPinCode: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReferralsData {
  referrals?: Array<{
    referredUser?: {
      userProfileUrl?: string;
      username: string;
    };
    xp: number;
    createdAt: Date;
  }>;
  count: number;
}

export interface LeaderboardData {
  leaderboard: Array<{
    username: string;
    xp: number;
    totalReferrals: number;
  }>;
}

export interface PrivateKeyData {
  privateKey: string;
}
