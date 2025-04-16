import mongoose, { Document, Types } from "mongoose";

export interface IReferral extends Document {
  referredBy: Types.ObjectId;
  referredUser: Types.ObjectId;
  xp: number;
  createdAt: Date;
  updatedAt: Date;
}
