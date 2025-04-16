import mongoose, { Schema } from "mongoose";
import { IReferral } from "../types/referral";

const ReferralSchema: Schema = new Schema<IReferral>(
  {
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    referredUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    xp: {
      type: Number,
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

export const Referral = mongoose.model<IReferral>("Referral", ReferralSchema);
