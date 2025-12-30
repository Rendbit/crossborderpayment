import { Request } from "express";
import httpStatus from "http-status";
import * as bcrypt from "bcryptjs";
import { User } from "../models/User";
import { Referral } from "../models/Referral";
import { Task } from "../models/Task";
import { UserTask } from "../models/UserTask";
import { TaskEnum } from "../common/enums/referralProgram/task.enum";
import {
  WalletDecryption,
  WalletEncryption,
} from "../helpers/encryption-decryption.helper";
import {
  IUserService,
  UserProfileData,
  LeaderboardData,
  PrivateKeyData,
} from "../types/user";
import { ServiceResponse } from "../types/response";
import {
  CreatePasswordSchema,
  UpdateProfileSchema,
  UpdateProfileImageSchema,
  ChangePasswordSchema,
  ExportPrivateKeySchema,
  GetReferralsSchema,
} from "../validators/user";
import { sanitizeInput, isValidObjectId } from "../utils/security";
import { MFA } from "../models/MFA";

export class UserService implements IUserService {
  async getUserProfile(req: Request): Promise<ServiceResponse<any>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as UserProfileData,
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as UserProfileData,
          success: false,
          message: "Invalid user ID format",
        };
      }

      const account = await User.findById(user._id)
        .select("-password -encryptedPrivateKey -pinCode")
        .lean();

      if (!account) {
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as UserProfileData,
          success: false,
          message: "User not found",
        };
      }

      const mfa = await MFA.findOne({
        user: user._id,
      }).lean();

      return {
        status: httpStatus.OK,
        data: {
          account,
          mfaSetup: {
            isEnabled: mfa?.isEnabled,
            isSetup: mfa?.isSetup,
          },
        },
        success: true,
        message: "Profile retrieved successfully",
      };
    } catch (error: any) {
      console.error("Error fetching profile details:", error);

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("Invalid key")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as UserProfileData,
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as UserProfileData,
        success: false,
        message: error.message,
      };
    }
  }

  async createPassword(req: Request): Promise<ServiceResponse<null>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
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

      // SECURITY: Validate request body with Zod
      CreatePasswordSchema.parse(req.body);

      const { password } = req.body;

      // SECURITY: Sanitize password
      const sanitizedPassword = sanitizeInput(password);
      if (!sanitizedPassword || typeof sanitizedPassword !== "string") {
        return {
          status: httpStatus.BAD_REQUEST,
          data: null,
          success: false,
          message: "Invalid password format",
        };
      }

      // Check if user already has password
      const existingUser = await User.findById(user._id);
      if (!existingUser) {
        return {
          status: httpStatus.NOT_FOUND,
          data: null,
          success: false,
          message: "User not found",
        };
      }

      if (existingUser.isPassword) {
        return {
          status: httpStatus.CONFLICT,
          data: null,
          success: false,
          message: "Password already exists",
        };
      }

      await User.findByIdAndUpdate(user._id, {
        $set: {
          password: bcrypt.hashSync(sanitizedPassword, 8),
          isPassword: true,
        },
      });

      return {
        status: httpStatus.OK,
        data: null,
        success: true,
        message: "Password created successfully",
      };
    } catch (error: any) {
      console.error("Error creating password:", error);

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

  async getUserReferrals(req: Request): Promise<ServiceResponse<any>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: { referrals: [], count: 0 },
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: { referrals: [], count: 0 },
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate query parameters
      GetReferralsSchema.parse(req.query);

      const { page = 1, limit = 10 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const [referrals, count] = await Promise.all([
        Referral.find(
          { referredBy: user._id },
          "-_id referredUser xp createdAt"
        )
          .populate("referredUser", "userProfileUrl username")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Referral.countDocuments({
          referredBy: user._id,
        }),
      ]);

      return {
        status: httpStatus.OK,
        data: { referrals, count },
        success: true,
        message: "Referrals fetched successfully",
      };
    } catch (error: any) {
      console.error("Error fetching referrals:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: { referrals: [], count: 0 },
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
          data: { referrals: [], count: 0 },
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: { referrals: [], count: 0 },
        success: false,
        message: error.message,
      };
    }
  }

  async getReferralLeaderBoard(
    req: Request
  ): Promise<ServiceResponse<LeaderboardData>> {
    try {
      // SECURITY: Validate query parameters
      GetReferralsSchema.parse(req.query);

      const { page = 1, limit = 10 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const leaderboard = await User.aggregate([
        { $match: { xp: { $gt: 0 } } },
        {
          $lookup: {
            from: "referrals",
            localField: "_id",
            foreignField: "referredBy",
            as: "referralData",
          },
        },
        {
          $addFields: {
            totalReferrals: { $size: "$referralData" },
          },
        },
        {
          $project: {
            _id: 0,
            username: 1,
            xp: 1,
            totalReferrals: 1,
          },
        },
        { $sort: { xp: -1 } },
        { $skip: skip },
        { $limit: Number(limit) },
      ]);

      return {
        status: httpStatus.OK,
        data: { leaderboard },
        success: true,
        message: "Leaderboard fetched successfully",
      };
    } catch (error: any) {
      console.error("Error fetching leaderboard:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: { leaderboard: [] },
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
          data: { leaderboard: [] },
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: { leaderboard: [] },
        success: false,
        message: error.message,
      };
    }
  }

  async updateProfile(req: Request): Promise<ServiceResponse<any>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as UserProfileData,
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as UserProfileData,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate request body with Zod
      UpdateProfileSchema.parse(req.body);

      const { username, country } = req.body;

      // SECURITY: Sanitize inputs
      const sanitizedUsername = username ? sanitizeInput(username) : undefined;
      const sanitizedCountry = country ? sanitizeInput(country) : undefined;

      const existingUser = await User.findById(user._id);
      if (!existingUser) {
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as UserProfileData,
          success: false,
          message: "User not found",
        };
      }

      const updateData: any = {};
      if (sanitizedUsername) updateData.username = sanitizedUsername;
      if (sanitizedCountry) updateData.country = sanitizedCountry;

      const updatedProfile = await User.findByIdAndUpdate(
        user._id,
        { $set: updateData },
        { new: true }
      )
        .select("-password -encryptedPrivateKey")
        .lean();

      // Check if this is the first profile update for XP reward
      if (
        (sanitizedUsername && !existingUser.username) ||
        (sanitizedCountry && !existingUser.country)
      ) {
        const task = await Task.findOne({
          name: TaskEnum.CompleteProfileSetup,
        });

        if (task) {
          const existingTask = await UserTask.findOne({
            user: user._id,
            task: task._id,
          });

          if (!existingTask) {
            await UserTask.create({
              user: user._id,
              task: task._id,
              completed: true,
            });

            // Add XP to user
            await User.findByIdAndUpdate(user._id, {
              $inc: { xp: task.xp },
            });
          }
        }
      }

      return {
        status: httpStatus.OK,
        data: updatedProfile,
        success: true,
        message: "Profile updated successfully",
      };
    } catch (error: any) {
      console.error("Error updating profile:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as UserProfileData,
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
          data: {} as UserProfileData,
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as UserProfileData,
        success: false,
        message: error.message,
      };
    }
  }

  async updateProfileImage(req: Request): Promise<ServiceResponse<any>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as UserProfileData,
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as UserProfileData,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate request body with Zod
      UpdateProfileImageSchema.parse(req.body);

      const { userProfileUrl } = req.body;

      // SECURITY: Sanitize URL
      const sanitizedUrl = sanitizeInput(userProfileUrl);
      if (!sanitizedUrl || typeof sanitizedUrl !== "string") {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as UserProfileData,
          success: false,
          message: "Invalid URL format",
        };
      }

      const updatedProfile = await User.findByIdAndUpdate(
        user._id,
        {
          $set: {
            userProfileUrl: sanitizedUrl,
          },
        },
        { new: true }
      )
        .select("-password -encryptedPrivateKey")
        .lean();

      return {
        status: httpStatus.OK,
        data: updatedProfile,
        success: true,
        message: "Profile image updated successfully",
      };
    } catch (error: any) {
      console.error("Error updating profile image:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as UserProfileData,
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
          data: {} as UserProfileData,
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as UserProfileData,
        success: false,
        message: error.message,
      };
    }
  }

  async changePassword(req: Request): Promise<ServiceResponse<null>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
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

      // SECURITY: Validate request body with Zod
      ChangePasswordSchema.parse(req.body);

      const { oldPassword, password } = req.body;

      // SECURITY: Sanitize passwords
      const sanitizedOldPassword = sanitizeInput(oldPassword);
      const sanitizedPassword = sanitizeInput(password);

      if (!sanitizedOldPassword || !sanitizedPassword) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: null,
          success: false,
          message: "Invalid password format",
        };
      }

      const existingUser = await User.findById(user._id);
      if (!existingUser) {
        return {
          status: httpStatus.NOT_FOUND,
          data: null,
          success: false,
          message: "Invalid account",
        };
      }

      // Validate old password
      if (existingUser.password) {
        if (!bcrypt.compareSync(sanitizedOldPassword, existingUser.password)) {
          return {
            status: httpStatus.UNAUTHORIZED,
            data: null,
            success: false,
            message: "Invalid old password",
          };
        }
      }

      let updateData: any = {
        password: bcrypt.hashSync(sanitizedPassword, 8),
      };

      // If user has encrypted private key, re-encrypt it with new password
      if (existingUser.encryptedPrivateKey) {
        const decryptedPrivateKey = WalletDecryption.decryptPrivateKey(
          existingUser.encryptedPrivateKey,
          `${existingUser.primaryEmail}${existingUser.password}${existingUser.pinCode}`
        );

        updateData.encryptedPrivateKey = WalletEncryption.encryptPrivateKey(
          decryptedPrivateKey,
          `${existingUser.primaryEmail}${updateData.password}${existingUser.pinCode}`
        );
      }

      await User.findByIdAndUpdate(user._id, { $set: updateData });

      return {
        status: httpStatus.OK,
        data: null,
        success: true,
        message: "Password changed successfully",
      };
    } catch (error: any) {
      console.error("Error changing password:", error);

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

  async exportPrivateKey(
    req: Request
  ): Promise<ServiceResponse<PrivateKeyData>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: { privateKey: "" },
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: { privateKey: "" },
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate request body with Zod
      ExportPrivateKeySchema.parse(req.body);

      const { pinCode } = req.body;

      // SECURITY: Sanitize pin code
      const sanitizedPinCode = sanitizeInput(pinCode);
      if (!sanitizedPinCode || typeof sanitizedPinCode !== "string") {
        return {
          status: httpStatus.BAD_REQUEST,
          data: { privateKey: "" },
          success: false,
          message: "Invalid pin code format",
        };
      }

      const existingUser = await User.findById(user._id);
      if (!existingUser) {
        return {
          status: httpStatus.NOT_FOUND,
          data: { privateKey: "" },
          success: false,
          message: "User not found",
        };
      }

      if (!existingUser.pinCode) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: { privateKey: "" },
          success: false,
          message: "Please create a pin code first",
        };
      }

      if (sanitizedPinCode !== existingUser.pinCode) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: { privateKey: "" },
          success: false,
          message: "Invalid pin code",
        };
      }

      if (!existingUser.encryptedPrivateKey)
        return {
          status: httpStatus.OK,
          data: { privateKey: "" },
          success: true,
          message: "Failed to export priavte key",
        };
      const decryptedPrivateKey = WalletDecryption.decryptPrivateKey(
        existingUser.encryptedPrivateKey,
        `${existingUser.primaryEmail}${existingUser.password}${sanitizedPinCode}`
      );

      return {
        status: httpStatus.OK,
        data: { privateKey: decryptedPrivateKey },
        success: true,
        message: "Private key exported successfully",
      };
    } catch (error: any) {
      console.error("Error exporting private key:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: { privateKey: "" },
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
          data: { privateKey: "" },
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: { privateKey: "" },
        success: false,
        message: error.message,
      };
    }
  }

  // Factory method for creating service instance
  static create(): UserService {
    return new UserService();
  }
}

// Export singleton instance
export const userService = UserService.create();
