import { Request } from "express";
import httpStatus from "http-status";
import { authenticator } from "otplib";
import { MFA } from "../models/MFA";
import { IMFAService, SecretData, MFASettingData } from "../types/mfa";
import { ServiceResponse } from "../types/response";
import { SetupMFASchema, VerifyOTPSchema } from "../validators/mfa";
import { isValidObjectId, sanitizeInput } from "../utils/security";

const issuer = `${process.env.APP_NAME}`;

export class MFAService implements IMFAService {
  async generateSecret(req: Request): Promise<ServiceResponse<SecretData>> {
    try {
      const user = (req as any).user;
      const { primaryEmail } = user;

      // SECURITY: Validate and sanitize inputs
      if (!user || !user._id || !primaryEmail) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: { secret: "", url: "" },
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: { secret: "", url: "" },
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Sanitize email
      const sanitizedEmail = sanitizeInput(primaryEmail);
      if (!sanitizedEmail || typeof sanitizedEmail !== "string") {
        return {
          status: httpStatus.BAD_REQUEST,
          data: { secret: "", url: "" },
          success: false,
          message: "Invalid email format",
        };
      }

      // SECURITY: Use findOne with sanitized query
      const mfaSetup = await MFA.findOne({
        user: user._id,
      }).lean();

      if (mfaSetup) {
        const otpAuthUrl = authenticator.keyuri(
          sanitizedEmail,
          issuer,
          mfaSetup.secret
        );
        return {
          status: httpStatus.OK,
          data: {
            secret: mfaSetup.secret,
            url: otpAuthUrl,
          },
          success: true,
          message: "MFA secret retrieved successfully",
        };
      }

      const secret = authenticator.generateSecret();
      const otpAuthUrl = authenticator.keyuri(sanitizedEmail, issuer, secret);

      // SECURITY: Create new document with validated data
      await new MFA({
        user: user._id,
        isEnabled: false,
        isSetup: false,
        secret,
      }).save();

      return {
        status: httpStatus.OK,
        data: {
          secret,
          url: otpAuthUrl,
        },
        success: true,
        message: "MFA secret generated successfully",
      };
    } catch (error: any) {
      console.error("Error generating secret: ", error);
      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: { secret: "", url: "" },
        success: false,
        message: error.message,
      };
    }
  }

  async setupMFA(req: Request): Promise<ServiceResponse<null>> {
    try {
      const user = (req as any).user;

      // Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: null,
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: null,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Use Zod parse() which THROWS on validation error
      // This will stop execution and go to catch block if validation fails
      SetupMFASchema.parse(req.body);

      // If we get here, validation passed
      const { code } = req.body;

      // SECURITY: Sanitize code input
      const sanitizedCode = sanitizeInput(code);
      if (!sanitizedCode || typeof sanitizedCode !== "string") {
        return {
          status: httpStatus.BAD_REQUEST,
          data: null,
          success: false,
          message: "Invalid code format",
        };
      }

      // SECURITY: Use findOne with validated ObjectId
      const mfaSetup = await MFA.findOne({
        user: user._id,
      }).lean();

      if (!mfaSetup) {
        return {
          status: httpStatus.NOT_FOUND,
          data: null,
          success: false,
          message: "MFA setup not found. Please generate a secret first.",
        };
      }

      if (mfaSetup.isSetup) {
        return {
          status: httpStatus.CONFLICT,
          data: null,
          success: false,
          message: "You have successfully setup MFA, Kindly contact support",
        };
      }

      const isValid = authenticator.verify({
        token: sanitizedCode,
        secret: mfaSetup.secret,
      });

      if (!isValid) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: null,
          success: false,
          message: "Invalid code",
        };
      }

      await MFA.findByIdAndUpdate(
        mfaSetup._id,
        {
          $set: {
            isSetup: true,
            isEnabled: true,
          },
        },
        { new: true }
      );

      return {
        status: httpStatus.OK,
        data: null,
        success: true,
        message: "You have successfully setup MFA",
      };
    } catch (error: any) {
      console.error("Error setting up MFA: ", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: null,
          success: false,
          message: `${errorMessages}`,
        };
      }

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("Invalid key")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: null,
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: null,
        success: false,
        message: error.message,
      };
    }
  }

  async verifyOTP(req: Request): Promise<ServiceResponse<null>> {
    try {
      const user = (req as any).user;

      // Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: null,
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: null,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Use Zod parse() which THROWS on validation error
      VerifyOTPSchema.parse(req.body);

      const { code } = req.body;

      // SECURITY: Sanitize code input
      const sanitizedCode = sanitizeInput(code);
      if (!sanitizedCode || typeof sanitizedCode !== "string") {
        return {
          status: httpStatus.BAD_REQUEST,
          data: null,
          success: false,
          message: "Invalid code format",
        };
      }

      const mfaSetup = await MFA.findOne({
        user: user._id,
      }).lean();

      if (!mfaSetup) {
        return {
          status: httpStatus.NOT_FOUND,
          data: null,
          success: false,
          message: "MFA not available on account.",
        };
      }

      if (!mfaSetup.isSetup) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: null,
          success: false,
          message: "MFA is not enabled on your account.",
        };
      }

      const isValid = authenticator.verify({
        token: sanitizedCode,
        secret: mfaSetup.secret,
      });

      if (!isValid) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: null,
          success: false,
          message: "Invalid code",
        };
      }

      return {
        status: httpStatus.OK,
        data: null,
        success: true,
        message: "OTP verified successfully",
      };
    } catch (error: any) {
      console.error("Error verifying OTP: ", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: null,
          success: false,
          message: `${errorMessages}`,
        };
      }

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("Invalid key")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: null,
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: null,
        success: false,
        message: error.message,
      };
    }
  }

  async getMFASetting(req: Request): Promise<ServiceResponse<MFASettingData>> {
    try {
      const user = (req as any).user;

      // Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: { isEnabled: false, isSetup: false },
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: { isEnabled: false, isSetup: false },
          success: false,
          message: "Invalid user ID format",
        };
      }

      const mfaSetup = await MFA.findOne({
        user: user._id,
      }).lean();

      if (!mfaSetup) {
        return {
          status: httpStatus.OK,
          data: {
            isEnabled: false,
            isSetup: false,
          },
          success: true,
          message: "MFA is not set up",
        };
      }

      return {
        status: httpStatus.OK,
        data: {
          isEnabled: mfaSetup.isEnabled,
          isSetup: mfaSetup.isSetup,
        },
        success: true,
        message: "MFA settings retrieved successfully",
      };
    } catch (error: any) {
      console.error("Error getting MFA setting: ", error);

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("Invalid key")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: { isEnabled: false, isSetup: false },
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: { isEnabled: false, isSetup: false },
        success: false,
        message: error.message,
      };
    }
  }

  async toggleMFASetup(req: Request): Promise<ServiceResponse<MFASettingData>> {
    try {
      const user = (req as any).user;

      // Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: { isEnabled: false, isSetup: false },
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: { isEnabled: false, isSetup: false },
          success: false,
          message: "Invalid user ID format",
        };
      }

      const mfaSetup = await MFA.findOne({
        user: user._id,
      }).lean();

      if (!mfaSetup) {
        return {
          status: httpStatus.NOT_FOUND,
          data: { isEnabled: false, isSetup: false },
          success: false,
          message: "MFA not available on account.",
        };
      }

      if (!mfaSetup.isSetup) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: { isEnabled: false, isSetup: false },
          success: false,
          message: "MFA is not set up. Please set up MFA first.",
        };
      }

      const updatedMFA = await MFA.findByIdAndUpdate(
        mfaSetup._id,
        {
          $set: {
            isEnabled: !mfaSetup.isEnabled,
          },
        },
        { new: true }
      ).lean();

      return {
        status: httpStatus.OK,
        data: {
          isEnabled: updatedMFA!.isEnabled,
          isSetup: updatedMFA!.isSetup,
        },
        success: true,
        message: `MFA ${
          updatedMFA!.isEnabled ? "enabled" : "disabled"
        } successfully`,
      };
    } catch (error: any) {
      console.error("Error toggling MFA setup: ", error);

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("Invalid key")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: { isEnabled: false, isSetup: false },
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: { isEnabled: false, isSetup: false },
        success: false,
        message: error.message,
      };
    }
  }

  // Factory method for creating service instance
  static create(): MFAService {
    return new MFAService();
  }
}

// Export singleton instance
export const mfaService = MFAService.create();
