import mongoose, { Schema } from "mongoose";
import { IUserSetting } from "../types/userSetting";
import { MODES } from "../common/enums/userSetting.enum";

const UserSettingSchema: Schema = new Schema<IUserSetting>({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  productAnnoucement: {
    type: Boolean,
    default: true,
  },
  accountActivity: {
    type: Boolean,
    default: true,
  },
  messages: {
    type: Boolean,
    default: true,
  },
  insightsTips: {
    type: Boolean,
    default: true,
  },
  networkFeeAlert: {
    type: Boolean,
    default: true,
  },
  screenPreference: {
    type: String,
    enum: Object.values(MODES),
    default: MODES.LIGHT,
  },
  currencyType: {
    type: String,
    default: "Fiat",
  },
});

export const UserSetting = mongoose.model<IUserSetting>(
  "UserSetting",
  UserSettingSchema
);
