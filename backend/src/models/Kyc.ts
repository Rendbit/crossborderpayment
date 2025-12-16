import { Schema, model } from 'mongoose';
import { IKyc } from '../types/kyc';
import { KycTier, KycStatus, KycDocumentType } from '../common/enums/kyc';

const KycSchema = new Schema<IKyc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  tier: { type: Number, enum: Object.values(KycTier), default: KycTier.NONE },
  status: { 
    type: String, 
    enum: Object.values(KycStatus), 
    default: KycStatus.PENDING 
  },
  documents: [{
    type: { type: String, enum: Object.values(KycDocumentType), required: true },
    url: { type: String, required: true },
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date }
  }],
  metadata: { type: Schema.Types.Mixed },
  verifiedAt: { type: Date }
}, {
  timestamps: true
});

export const Kyc = model<IKyc>('Kyc', KycSchema);