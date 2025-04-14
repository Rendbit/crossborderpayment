import { Schema, model } from 'mongoose';
import { UserRole } from '../common/enums/user.enum';
import { IUser } from '../types/user';

// Create the Mongoose Schema
const UserSchema = new Schema<IUser>({
  secondaryEmail: { 
    type: String, 
    trim: true 
  },
  primaryEmail: { 
    type: String, 
    unique: true, 
    required: true, 
    trim: true 
  },
  password: { 
    type: String 
  },
  isPassword: { 
    type: Boolean, 
    required: true, 
    default: true 
  },
  pinCode: { 
    type: String 
  },
  userProfileUrl: { 
    type: String 
  },
  role: { 
    type: [String], 
    required: true, 
    default: [UserRole.USER] 
  },
  country: { 
    type: String 
  },
  xp: { 
    type: Number 
  },
  username: { 
    type: String, 
    unique: true, 
    required: true, 
    trim: true 
  },
  stellarPublicKey: { 
    type: String 
  },
  isEmailVerified: { 
    type: Boolean, 
    default: false, 
    required: true 
  },
  isSuspended: { 
    type: Boolean, 
    default: false, 
    required: true 
  },
  isCaptchaVerified: { 
    type: Boolean, 
    default: false, 
    required: false 
  },
  totalWalletBalance: { 
    type: Number, 
    default: 0 
  },
  encryptedPrivateKey: { 
    type: String 
  },
  spendableBalance: { 
    type: Number, 
    default: 0 
  },
  savingsBalance: { 
    type: Number, 
    default: 0 
  },
  referralCode: { 
    type: String, 
    unique: true, 
    required: true 
  },
  points: { 
    type: Number, 
    default: 0 
  },
  createdAt: { 
    type: Date, 
    default: Date.now, 
    required: true 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now, 
    required: true 
  }
});

// Add index if needed
UserSchema.index({ username: 1, primaryEmail: 1 }, { unique: true });

// Middleware for updatedAt
UserSchema.pre<IUser>('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create and export the model
export const User = model<IUser>('User', UserSchema);