import {  Document } from "mongoose";
export interface IUser extends Document {
  secondaryEmail?: string;
  primaryEmail: string;
  password?: string;
  isPassword: boolean;
  pinCode?: string;
  userProfileUrl?: string;
  role: string[];
  country?: string;
  xp?: number;
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
  createdAt: Date;
  updatedAt: Date;
}
