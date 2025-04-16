import {  Document, Types } from "mongoose";

export interface IMFA extends Document {
  secret: string;
  isEnabled: boolean;
  isEmail: boolean;
  isSetup: boolean;
  user: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
