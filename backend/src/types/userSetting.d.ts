import mongoose, { Document, Types } from "mongoose";
import { MODES } from "../common/enums/userSetting.enum";

/**
 * Interface for UserSetting Document
 */
export interface IUserSetting extends Document {
  user: Types.ObjectId;
  productAnnoucement: boolean;
  accountActivity: boolean;
  messages: boolean;
  insightsTips: boolean;
  networkFeeAlert: boolean;
  screenPreference: MODES;
  currencyType: string;
}
