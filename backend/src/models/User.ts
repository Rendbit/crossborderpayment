import { Schema, model } from "mongoose";
import { IUser } from "../types/user";
import {
  UserRole,
  AccountStatus,
  VerificationType,
} from "../common/enums/user";
import { KycTier, KycStatus } from "../common/enums/kyc";

const UserSchema = new Schema<IUser>(
  {
    secondaryEmail: { type: String, trim: true },
    primaryEmail: { type: String, unique: true, required: true, trim: true },
    password: { type: String },
    isPassword: { type: Boolean, required: true, default: true },
    pinCode: { type: String },
    userProfileUrl: { type: String },
    role: {
      type: [String],
      enum: Object.values(UserRole),
      default: [UserRole.USER],
    },
    country: { type: String },
    xp: { type: Number, default: 0 },
    username: { type: String, unique: true, required: true, trim: true },
    stellarPublicKey: { type: String },
    isEmailVerified: { type: Boolean, default: false, required: true },
    isSuspended: { type: Boolean, default: false, required: true },
    isCaptchaVerified: { type: Boolean, default: false },
    totalWalletBalance: { type: Number, default: 0 },
    encryptedPrivateKey: { type: String },
    spendableBalance: { type: Number, default: 0 },
    savingsBalance: { type: Number, default: 0 },
    referralCode: { type: String, unique: true, required: true },
    points: { type: Number, default: 0 },

    // KYC & Compliance Fields
    kycTier: {
      type: Number,
      enum: Object.values(KycTier),
      default: KycTier.NONE,
    },
    kycStatus: {
      type: String,
      enum: Object.values(KycStatus),
      default: KycStatus.PENDING,
    },
    kycVerifiedAt: { type: Date },
    accountStatus: {
      type: String,
      enum: Object.values(AccountStatus),
      default: AccountStatus.ACTIVE,
    },
    pendingVerification: {
      type: String,
      enum: Object.values(VerificationType),
    },

    // Risk & Limits
    amlRiskScore: { type: Number, min: 0, max: 100 },
    amlRiskLevel: { type: String, enum: ["low", "medium", "high"] },
    totalDeposits: { type: Number, default: 0 },
    totalWithdrawals: { type: Number, default: 0 },
    firstDepositDate: { type: Date },
    lastDepositDate: { type: Date },

    // Velocity tracking
    dailyLimitUsed: {
      fiatToCrypto: { type: Number, default: 0 },
      cryptoToFiat: { type: Number, default: 0 },
      cryptoToCrypto: { type: Number, default: 0 },
      fiatToFiat: { type: Number, default: 0 },
    },
    weeklyLimitUsed: {
      fiatToCrypto: { type: Number, default: 0 },
      cryptoToFiat: { type: Number, default: 0 },
      cryptoToCrypto: { type: Number, default: 0 },
      fiatToFiat: { type: Number, default: 0 },
    },
    monthlyLimitUsed: {
      fiatToCrypto: { type: Number, default: 0 },
      cryptoToFiat: { type: Number, default: 0 },
      cryptoToCrypto: { type: Number, default: 0 },
      fiatToFiat: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

export const User = model<IUser>("User", UserSchema);
