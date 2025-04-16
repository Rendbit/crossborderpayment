import mongoose, { Schema } from "mongoose";
import { IMFA } from "../types/mfa";

const MFASchema: Schema = new Schema<IMFA>(
  {
    secret: {
      type: String,
      required: true,
    },
    isEnabled: {
      type: Boolean,
      default: false,
    },
    isEmail: {
      type: Boolean,
      default: false,
    },
    isSetup: {
      type: Boolean,
      default: false,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

export const MFA = mongoose.model<IMFA>("MFA", MFASchema);
