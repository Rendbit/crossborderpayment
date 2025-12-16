import { Request } from "express";
import { Document, Types } from "mongoose";
import { ServiceResponse } from "./response";

export interface IMFA extends Document {
  secret: string;
  isEnabled: boolean;
  isEmail: boolean;
  isSetup: boolean;
  user: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMFAService {
  generateSecret(req: Request): Promise<ServiceResponse<SecretData>>;
  setupMFA(req: Request): Promise<ServiceResponse<null>>;
  verifyOTP(req: Request): Promise<ServiceResponse<null>>;
  getMFASetting(req: Request): Promise<ServiceResponse<MFASettingData>>;
  toggleMFASetup(req: Request): Promise<ServiceResponse<MFASettingData>>;
}

export interface SecretData {
  secret: string;
  url: string;
}

export interface MFASettingData {
  isEnabled: boolean;
  isSetup: boolean;
}
