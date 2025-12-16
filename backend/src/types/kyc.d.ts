import { Document, Types } from "mongoose";
import { KycTier, KycStatus, KycDocumentType } from "../common/enums/kyc";

export interface IKyc extends Document {
  userId: Types.ObjectId;
  tier: KycTier;
  status: KycStatus;
  documents: {
    type: KycDocumentType;
    url: string;
    verified: boolean;
    verifiedAt?: Date;
  }[];
  metadata?: Record<string, any>;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
