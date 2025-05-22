import { MFA } from "../models/MFA";
import httpStatus from "http-status";
import { authenticator } from "otplib";

// Constant defining the issuer name for the OTP authentication URL
const issuer = `${process.env.APP_NAME}`;

export const generateSecret = async (req: any, res: any) => {
    try {
      const user = req.user;
      const mfaSetup = await MFA.findOne({ user: user._id }).lean();
      if (mfaSetup) {
        const otpAuthUrl = authenticator.keyuri(
          user.primaryEmail,
          issuer,
          mfaSetup.secret
        );
        return res.status(httpStatus.OK).json({
          data: {
            secret: mfaSetup.secret,
            url: otpAuthUrl,
          },
          status: httpStatus.OK,
          success: true,
          message: "MFA secret retrieved successfully",
        });
      }
  
      const secret = authenticator.generateSecret();
      const otpAuthUrl = authenticator.keyuri(user.primaryEmail, issuer, secret);
      await new MFA({
        user: user._id,
        isEnabled: false,
        isSetup: false,
        secret,
      }).save();
      return res.status(httpStatus.OK).json({
        data: {
          secret,
          url: otpAuthUrl,
        },
        status: httpStatus.OK,
        success: true,
        message: "MFA secret generated successfully",
      });
    } catch (error: any) {
      console.log("Error generating secret: ", error);
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || "Error generating secret.",
        status: httpStatus.INTERNAL_SERVER_ERROR,
        success: false,
        data: null,
      });
    }
  };
  
  export const setupMFA = async (req: any, res: any) => {
    try {
      const user = req.user;
      const { code } = req.body;
      const mfaSetup: any = await MFA.findOne({ user: user._id }).lean();
  
      if (mfaSetup && mfaSetup.isSetup)
        throw new Error(
          "You have successfully setup MFA, Kindly contact support"
        );
  
      const validate = authenticator.verify({
        token: code,
        secret: mfaSetup?.secret,
      });
      if (!validate) throw new Error("Invalid code");
  
      await MFA.findByIdAndUpdate(
        mfaSetup?._id,
        {
          $set: {
            isSetup: true,
            isEnabled: true,
          },
        },
        { new: true }
      );
      return res.status(httpStatus.OK).json({
        data: null,
        status: httpStatus.OK,
        success: true,
        message: "You have successfully setup MFA",
      });
    } catch (error: any) {
      console.log("Error setting up MFA: ", error);
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || "Error Error setting up MFA.",
        status: httpStatus.INTERNAL_SERVER_ERROR,
        success: false,
        data: null,
      });
    }
  };
  
  export const verifyOTP = async (req: any, res: any) => {
    try {
      const user = req.user;
      const { code } = req.body;
      const mfaSetup = await MFA.findOne({ user: user._id }).lean();
  
      if (!mfaSetup || !mfaSetup.isSetup || !mfaSetup.isEnabled)
        throw new Error("MFA not available on account.");
  
      const validate = authenticator.verify({
        token: code,
        secret: mfaSetup.secret,
      });
      if (!validate) throw new Error("Invalid code");
  
      return res.status(httpStatus.OK).json({
        message: "OTP verified successfully",
        status: httpStatus.OK,
        success: true,
        data: null,
      });
    } catch (error: any) {
      console.log("Error verifying OTP: ", error);
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || "Error verifying OTP.",
        status: httpStatus.INTERNAL_SERVER_ERROR,
        success: false,
        data: null,
      });
    }
  };
  
  export const getMFASetting = async (req: any, res: any) => {
    try {
      const user = req.user;
      const mfaSetup = await MFA.findOne({ user: user._id }).lean();
  
      if (!mfaSetup)
        return res.status(httpStatus.NOT_FOUND).json({
          data: {
            isEnabled: false,
            isSetup: false,
          },
          status: httpStatus.NOT_FOUND,
          success: true,
          message: "MFA settings not found, returning default",
        });
  
      return res.status(httpStatus.OK).json({
        data: {
          isEnabled: mfaSetup.isEnabled,
          isSetup: mfaSetup.isSetup,
        },
        status: httpStatus.OK,
        success: true,
        message: "MFA settings retrieved successfully",
      });
    } catch (error: any) {
      console.log("Error getting MFA setting: ", error);
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || "Error retrieving MFA setting.",
        status: httpStatus.INTERNAL_SERVER_ERROR,
        success: false,
        data: null,
      });
    }
  };
  
  export const toggleMFASetup = async (req: any, res: any) => {
    try {
      const user = req.user;
      const mfaSetup = await MFA.findOne({ user: user._id }).lean();
  
      if (!mfaSetup) throw new Error("MFA not available on account.");
      if (!mfaSetup.isSetup) throw new Error("MFA not available on account.");
  
      const mfaUpdate = await MFA.findByIdAndUpdate(
        mfaSetup._id,
        {
          $set: {
            isEnabled: !mfaSetup.isEnabled,
          },
        },
        { new: true }
      );
  
      return res.status(httpStatus.OK).json({
        data: {
          isEnabled: mfaUpdate?.isEnabled,
          isSetup: mfaUpdate?.isSetup,
        },
        status: httpStatus.OK,
        success: true,
        message: `MFA ${mfaUpdate?.isEnabled ? "enabled" : "disabled"} successfully`,
      });
    } catch (error: any) {
      console.log("Error toggling MFA setup: ", error);
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        message: error.message || "Error toggling MFA setup.",
        status: httpStatus.INTERNAL_SERVER_ERROR,
        success: false,
        data: null,
      });
    }
  };
  