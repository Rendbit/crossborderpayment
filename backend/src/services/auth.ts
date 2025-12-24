import * as bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { Request } from "express";
import { User } from "../models/User";
import httpStatus from "http-status";
import { TaskEnum } from "../common/enums/referralProgram/task.enum";
import { JwtHelper } from "../helpers/jwt.helper";
import { EmailHelper } from "../helpers/email.helper";
import { Helpers } from "../helpers";
import { MFA } from "../models/MFA";
import { Referral } from "../models/Referral";
import { UserSetting } from "../models/UserSetting";
import { UserTask } from "../models/UserTask";
import { Task } from "../models/Task";
import { emitEvent } from "../microservices/rabbitmq";
import { internalCacheService } from "../microservices/redis";
import { BlockchainFactory } from "../providers/blockchainFactory";
import {
  IAuthService,
  WalletData,
  FriendbotData,
  FundPreviewData,
  FundData,
  LoginData,
  TokenData,
  EmailValidationData,
  RegisterData,
  ValidateUserData,
  ForgotPasswordData,
  ResendOTPData,
  VerifyEmailData,
  ResetPasswordData,
} from "../types/blockchain";
import { ServiceResponse } from "../types/response";
import {
  CreateWalletSchema,
  FriendbotSchema,
  FundAccountPreviewSchema,
  FundAccountSchema,
  LoginSchema,
  EmailValidationSchema,
  RegisterSchema,
  ForgotPasswordSchema,
  ResendOTPSchema,
  VerifyEmailSchema,
  ResetPasswordSchema,
  ValidateUserSchema,
} from "../validators/auth";
import { sanitizeInput, isValidObjectId } from "../utils/security";
import { WalletDecryption, WalletEncryption } from "../helpers/encryption-decryption.helper";

export class AuthService implements IAuthService {
  async createWallet(req: Request): Promise<ServiceResponse<WalletData>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as WalletData,
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as WalletData,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate request body with Zod
      const validatedBody = CreateWalletSchema.parse(req.body);

      // SECURITY: Sanitize all inputs
      const sanitizedPinCode = sanitizeInput(validatedBody.pinCode);
      const sanitizedUsername = sanitizeInput(validatedBody.username);
      const sanitizedCountry = sanitizeInput(validatedBody.country);

      // Validate sanitized inputs
      if (
        !sanitizedPinCode ||
        typeof sanitizedPinCode !== "string" ||
        sanitizedPinCode.length !== 4
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as WalletData,
          success: false,
          message: "Invalid PIN code format",
        };
      }

      if (
        !sanitizedUsername ||
        typeof sanitizedUsername !== "string" ||
        sanitizedUsername.length < 3
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as WalletData,
          success: false,
          message: "Invalid username format",
        };
      }

      if (
        !sanitizedCountry ||
        typeof sanitizedCountry !== "string" ||
        sanitizedCountry.length !== 2
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as WalletData,
          success: false,
          message: "Invalid country code format",
        };
      }

      // Check if username already exists
      const existingUser = await User.findOne({
        username: sanitizedUsername,
      }).lean();
      if (existingUser) {
        return {
          status: httpStatus.CONFLICT,
          data: {} as WalletData,
          success: false,
          message: "Username already exists.",
        };
      }

      // Check if user already has a wallet
      const currentUser = await User.findById(user._id).lean();
      if (currentUser?.stellarPublicKey) {
        return {
          status: httpStatus.CONFLICT,
          data: {} as WalletData,
          success: false,
          message: "You already have a wallet.",
        };
      }

      // Use blockchain provider
      const blockchain = BlockchainFactory.getAuthProvider("stellar");
      const wallet = await blockchain.createWallet(user, sanitizedPinCode);

      // Update user with wallet info
      const account = await User.findByIdAndUpdate(
        user._id,
        {
          $set: {
            stellarPublicKey: wallet.publicKey,
            encryptedPrivateKey: wallet.encryptedPrivateKey,
            pinCode: sanitizedPinCode,
            username: sanitizedUsername,
            country: sanitizedCountry,
          },
        },
        { new: true }
      )
        .select("-password -encryptedPrivateKey")
        .lean();

      if (!account) {
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as WalletData,
          success: false,
          message: "User not found",
        };
      }

      const jwt = await JwtHelper.signToken(user);
      const refreshToken = await JwtHelper.refreshJWT(user);

      return {
        status: httpStatus.OK,
        data: {
          account,
          publicKey: wallet.publicKey,
          token: jwt,
          refreshToken,
        },
        success: true,
        message: "Wallet created successfully",
      };
    } catch (error: any) {
      console.error("Error creating wallet:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as WalletData,
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
          data: {} as WalletData,
          success: false,
          message: error.message,
        };
      }

      // Handle provider errors
      if (error.status) {
        return {
          status: error.status,
          data: {} as WalletData,
          success: false,
          message: error.message || "Error creating wallet",
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as WalletData,
        success: false,
        message: "Internal server error",
      };
    }
  }

  async fundWithFriendbot(
    publicKey: string
  ): Promise<ServiceResponse<FriendbotData>> {
    try {
      // SECURITY: Validate public key with Zod
      const validated = FriendbotSchema.parse({ publicKey });

      // SECURITY: Sanitize public key
      const sanitizedPublicKey = sanitizeInput(validated.publicKey);
      if (
        !sanitizedPublicKey ||
        typeof sanitizedPublicKey !== "string" ||
        sanitizedPublicKey.length !== 56
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as FriendbotData,
          success: false,
          message: "Invalid public key format",
        };
      }

      const blockchain = BlockchainFactory.getAuthProvider("stellar");
      const result = await blockchain.fundWithFriendbot(sanitizedPublicKey);

      return {
        status: httpStatus.OK,
        data: {
          transactionHash: result.transactionHash,
        },
        success: true,
        message: "Account funded successfully",
      };
    } catch (error: any) {
      console.error("Error funding account with friendbot:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as FriendbotData,
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
          data: {} as FriendbotData,
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as FriendbotData,
        success: false,
        message: "Error funding account with friendbot",
      };
    }
  }

  async fundAccountPreview(
    req: Request
  ): Promise<ServiceResponse<FundPreviewData>> {
    try {
      // SECURITY: Validate query parameters with Zod
      const validated = FundAccountPreviewSchema.parse(req.query);

      // SECURITY: Sanitize destination
      const sanitizedDestination = sanitizeInput(validated.destination);
      if (
        !sanitizedDestination ||
        typeof sanitizedDestination !== "string" ||
        sanitizedDestination.length !== 56
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as FundPreviewData,
          success: false,
          message: "Invalid destination address format",
        };
      }

      const blockchain = BlockchainFactory.getAuthProvider("stellar");
      const result = await blockchain.fundAccountPreview(sanitizedDestination);

      return {
        status: httpStatus.OK,
        data: {
          previewDetails: result,
        },
        success: true,
        message: "Funding preview generated successfully",
      };
    } catch (error: any) {
      console.error("Error generating funding preview:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as FundPreviewData,
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
          data: {} as FundPreviewData,
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as FundPreviewData,
        success: false,
        message: "Error generating funding preview",
      };
    }
  }

  async fundAccount(req: Request): Promise<ServiceResponse<FundData>> {
    try {
      // SECURITY: Validate request body with Zod
      const validatedBody = FundAccountSchema.parse(req.body);

      // SECURITY: Sanitize all inputs
      const sanitizedDestination = sanitizeInput(validatedBody.destination);
      const sanitizedAmount = sanitizeInput(validatedBody.amount);
      const sanitizedKey = sanitizeInput(validatedBody.key);

      // Validate sanitized inputs
      if (
        !sanitizedDestination ||
        typeof sanitizedDestination !== "string" ||
        sanitizedDestination.length !== 56
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as FundData,
          success: false,
          message: "Invalid destination address format",
        };
      }

      if (!sanitizedAmount || !sanitizedAmount.match(/^\d+(\.\d+)?$/)) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as FundData,
          success: false,
          message: "Invalid amount format",
        };
      }

      if (!sanitizedKey || typeof sanitizedKey !== "string") {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as FundData,
          success: false,
          message: "Invalid key format",
        };
      }

      const blockchain = BlockchainFactory.getAuthProvider("stellar");
      const result = await blockchain.fundAccount(
        sanitizedDestination,
        sanitizedAmount,
        sanitizedKey
      );

      return {
        status: httpStatus.OK,
        data: result.data,
        success: true,
        message: "Account funded successfully",
      };
    } catch (error: any) {
      console.error("Error funding account:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as FundData,
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
          data: {} as FundData,
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as FundData,
        success: false,
        message: "Error funding account",
      };
    }
  }

  async login(req: Request): Promise<ServiceResponse<LoginData>> {
    try {
      // SECURITY: Validate request body with Zod
      const validatedBody = LoginSchema.parse(req.body);
      // SECURITY: Sanitize all inputs
      const sanitizedEmail = EmailHelper.format(
        sanitizeInput(validatedBody.email)
      );

      const sanitizedPassword = sanitizeInput(validatedBody.password);
      let sanitizedCode, sanitizedCaptcha;
      if (validatedBody.code) {
        sanitizedCode = validatedBody.code
          ? sanitizeInput(validatedBody.code)
          : undefined;
      }

      if (validatedBody.captcha)
        sanitizedCaptcha = validatedBody.captcha
          ? sanitizeInput(validatedBody.captcha)
          : undefined;

      // Validate email format
      if (!EmailHelper.isValidEmail(sanitizedEmail)) {
        return {
          status: httpStatus.NOT_ACCEPTABLE,
          data: {} as LoginData,
          success: false,
          message: "Invalid email format",
        };
      }

      // Find user
      const account = await User.findOne(
        { primaryEmail: sanitizedEmail },
        "-encryptedPrivateKey"
      ).lean();

      if (!account) {
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as LoginData,
          success: false,
          message: "Invalid credentials",
        };
      }

      // Verify password
      if (
        !account.password ||
        !bcrypt.compareSync(sanitizedPassword, account.password)
      ) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as LoginData,
          success: false,
          message: "Invalid credentials",
        };
      }

      // MFA verification
      const mfa = await MFA.findOne({ user: account._id }).lean();

      if (process.env.NODE_ENV === "production") {
        if (mfa && mfa.isSetup && mfa.isEnabled && !sanitizedCode) {
          return {
            status: httpStatus.UNAUTHORIZED,
            data: {} as LoginData,
            success: false,
            message:
              "Multi-factor authentication required. Please provide your MFA code.",
          };
        }

        if (mfa && mfa.isSetup && mfa.isEnabled && sanitizedCode) {
          const validate = authenticator.verify({
            token: sanitizedCode,
            secret: mfa.secret,
          });

          if (!validate) {
            return {
              status: httpStatus.UNAUTHORIZED,
              data: {} as LoginData,
              success: false,
              message: "Invalid MFA code",
            };
          }
        }
      }

      // Get user without sensitive data
      const user = await User.findOne(
        { primaryEmail: sanitizedEmail },
        "-encryptedPrivateKey -password"
      ).lean();

      if (!user) {
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as LoginData,
          success: false,
          message: "Invalid credentials",
        };
      }

      // Update captcha verification status
      await User.findOneAndUpdate(
        { primaryEmail: sanitizedEmail },
        { $set: { isCaptchaVerified: false } },
        { new: true }
      );

      // Generate tokens
      const jwt = await JwtHelper.signToken(user);
      const refreshToken = await JwtHelper.refreshJWT(user);

      return {
        status: httpStatus.OK,
        data: {
          user,
          token: jwt,
          refreshToken,
        },
        success: true,
        message: "Login successful",
      };
    } catch (error: any) {
      console.error("Error logging in:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as LoginData,
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
          data: {} as LoginData,
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as LoginData,
        success: false,
        message: "Error logging in",
      };
    }
  }

  async authorizeRefreshToken(
    req: Request
  ): Promise<ServiceResponse<TokenData>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as TokenData,
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as TokenData,
          success: false,
          message: "Invalid user ID format",
        };
      }

      const account = await User.findById(
        user._id,
        "-encryptedPrivateKey -password"
      ).lean();

      if (!account) {
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as TokenData,
          success: false,
          message: "User not found",
        };
      }

      const jwt = await JwtHelper.signToken(user);
      const refreshToken = await JwtHelper.refreshJWT(user);

      return {
        status: httpStatus.OK,
        data: {
          user: account,
          token: jwt,
          refreshToken,
        },
        success: true,
        message: "Token refreshed successfully",
      };
    } catch (error: any) {
      console.error("Error authorizing refresh token:", error);

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("Invalid key")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as TokenData,
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as TokenData,
        success: false,
        message: "Error authorizing refresh token",
      };
    }
  }

  async requestEmailValidation(
    req: Request
  ): Promise<ServiceResponse<EmailValidationData>> {
    try {
      // SECURITY: Validate request body with Zod
      const validatedBody = EmailValidationSchema.parse(req.body);

      // SECURITY: Sanitize email
      const sanitizedEmail = EmailHelper.format(
        sanitizeInput(validatedBody.email)
      );

      // Validate email format
      if (!EmailHelper.isValidEmail(sanitizedEmail)) {
        return {
          status: httpStatus.NOT_ACCEPTABLE,
          data: {} as EmailValidationData,
          success: false,
          message: "Invalid email format",
        };
      }

      // Check if email already exists
      const findEmail = await User.findOne(
        { primaryEmail: sanitizedEmail },
        "-encryptedPrivateKey -password"
      ).lean();

      if (findEmail) {
        return {
          status: httpStatus.CONFLICT,
          data: {} as EmailValidationData,
          success: false,
          message: "Email already registered",
        };
      }

      // Generate and store OTP
      const otp = Helpers.generateOTP(4);
      await internalCacheService.set(sanitizedEmail, otp, 18000);

      return {
        status: httpStatus.OK,
        data: { success: true },
        success: true,
        message: "Email validation OTP sent to your email.",
      };
    } catch (error: any) {
      console.error("Error requesting email validation:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as EmailValidationData,
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
          data: {} as EmailValidationData,
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as EmailValidationData,
        success: false,
        message: "Error requesting email validation",
      };
    }
  }

  async register(req: Request): Promise<ServiceResponse<RegisterData>> {
    try {
      // SECURITY: Validate request body with Zod
      const validatedBody = RegisterSchema.parse(req.body);

      // SECURITY: Sanitize all inputs
      const sanitizedEmail = EmailHelper.format(
        sanitizeInput(validatedBody.email)
      );
      const sanitizedPassword = sanitizeInput(validatedBody.password);
      const sanitizedReferralCode = validatedBody.referralCode
        ? sanitizeInput(validatedBody.referralCode).toUpperCase()
        : undefined;

      // Validate email format
      if (!EmailHelper.isValidEmail(sanitizedEmail)) {
        return {
          status: httpStatus.NOT_ACCEPTABLE,
          data: {} as RegisterData,
          success: false,
          message: "Invalid email format",
        };
      }

      // Check if email already exists
      const foundEmail = await User.findOne(
        { primaryEmail: sanitizedEmail },
        "-encryptedPrivateKey -password"
      ).lean();

      if (foundEmail) {
        return {
          status: httpStatus.CONFLICT,
          data: {} as RegisterData,
          success: false,
          message: "Email already registered",
        };
      }

      // Password strength validation
      const passwordErrors = [];
      if (sanitizedPassword.length < 8)
        passwordErrors.push("at least 8 characters");
      if (!/[A-Z]/.test(sanitizedPassword))
        passwordErrors.push("an uppercase letter");
      if (!/[a-z]/.test(sanitizedPassword))
        passwordErrors.push("a lowercase letter");
      if (!/[0-9]/.test(sanitizedPassword)) passwordErrors.push("a number");
      if (!/[\W_]/.test(sanitizedPassword))
        passwordErrors.push("a special character");

      if (passwordErrors.length > 0) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as RegisterData,
          success: false,
          message: `Password must contain ${passwordErrors.join(", ")}`,
        };
      }

      // Create user
      const userReferralCode = Helpers.generateOTP(7);
      const hashedPassword = bcrypt.hashSync(sanitizedPassword, 8);

      const user = await new User({
        primaryEmail: sanitizedEmail,
        password: hashedPassword,
        username: sanitizedEmail.split("@")[0],
        referralCode: `rb-${userReferralCode}`,
      }).save();

      const account = await User.findOne(
        { primaryEmail: user.primaryEmail },
        "-encryptedPrivateKey -password"
      ).lean();

      if (!account) {
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as RegisterData,
          success: false,
          message: "Registration failed",
        };
      }

      // Create user settings
      await new UserSetting({ user: account._id }).save();

      // Handle referral
      if (sanitizedReferralCode) {
        const referredBy = await User.findOne(
          { referralCode: sanitizedReferralCode },
          "xp"
        );

        if (referredBy) {
          await new Referral({
            referredBy: referredBy._id,
            referredUser: account._id,
            xp: 50,
          }).save();

          const task = await Task.findOne({
            name: TaskEnum.ReferAFriend,
          }).lean();
          if (task) {
            await UserTask.create({
              user: referredBy._id,
              task: task._id,
              completed: true,
            });
            referredBy.xp = (referredBy.xp ?? 0) + 50;
            await referredBy.save();
          } else {
            referredBy.xp = (referredBy.xp ?? 0) + 50;
            await referredBy.save();
          }
        }
      }

      // Generate OTP for email verification
      const otp = Helpers.generateOTP(4);
      await internalCacheService.set(String(otp), account._id, 1000);

      // Generate tokens
      const [jwt, refreshToken] = await Promise.all([
        JwtHelper.signToken(account),
        JwtHelper.refreshJWT(account),
      ]);

      // Send welcome email
      emitEvent("send:general:email", {
        to: account.primaryEmail,
        subject: `🎉 Welcome to ${process.env.APP_NAME}! Let's Get Started!`,
        username: account.primaryEmail.split("@")[0],
        appName: process.env.APP_NAME,
        featureLink: process.env.CLIENT_URL,
        profileLink: `${process.env.CLIENT_URL}/settings`,
        communityLink: process.env.TELEGRAM_COMMUNITY_URL,
        socialMediaLink: process.env.X_URL,
        supportEmail: process.env.EMAIL_USERNAME,
      }).catch((err: any) => {
        console.error("Error emitting send:general:email event:", err.message);
      });

      // Send verification email
      emitEvent("send:otp:email", {
        to: account.primaryEmail,
        subject: "Verify Your Email",
        content: "Kindly use this code to verify your email",
        code: otp,
        username: account.username,
      }).catch((err: any) => {
        console.error("Error emitting send:otp:email event:", err.message);
      });

      return {
        status: httpStatus.CREATED,
        data: {
          user: account,
          token: jwt,
          refreshToken,
        },
        success: true,
        message: "Registration successful",
      };
    } catch (error: any) {
      console.error("Error registering:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as RegisterData,
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
          data: {} as RegisterData,
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as RegisterData,
        success: false,
        message: "Error registering",
      };
    }
  }

  async validateUser(details: any): Promise<ServiceResponse<ValidateUserData>> {
    try {
      // SECURITY: Validate input with Zod
      const validatedDetails = ValidateUserSchema.parse(details);

      // SECURITY: Sanitize all inputs
      const sanitizedEmail = EmailHelper.format(
        sanitizeInput(validatedDetails.email)
      );
      const sanitizedUserProfileUrl = validatedDetails.userProfileUrl
        ? sanitizeInput(validatedDetails.userProfileUrl)
        : undefined;

      // Check if user exists
      const user = await User.findOne(
        { primaryEmail: sanitizedEmail },
        "-encryptedPrivateKey -password"
      ).lean();

      if (user) {
        const jwt = await JwtHelper.signToken(user);
        const refreshToken = await JwtHelper.refreshJWT(user);

        return {
          status: httpStatus.OK,
          data: {
            user,
            token: jwt,
            refreshToken,
          },
          success: true,
          message: "User validated successfully",
        };
      }

      // Create new user for social login
      const referralCode = Helpers.generateOTP(7);
      const otp = Helpers.generateOTP(4);
      const tempPassword = bcrypt.hashSync(`${otp + sanitizedEmail}`, 8);

      const newUser = await new User({
        primaryEmail: sanitizedEmail,
        isPassword: false,
        password: tempPassword,
        username: sanitizedEmail.split("@")[0],
        userProfileUrl: sanitizedUserProfileUrl,
        isEmailVerified: validatedDetails.isEmailVerified || false,
        referralCode: `rb-${referralCode}`,
      }).save();

      const account = await User.findOne(
        { primaryEmail: newUser.primaryEmail },
        "-encryptedPrivateKey -password"
      ).lean();

      if (!account) {
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as ValidateUserData,
          success: false,
          message: "User creation failed",
        };
      }

      // Create user settings and cache OTP
      await Promise.all([
        new UserSetting({ user: account._id }).save(),
        internalCacheService.set(String(otp), account._id, 1000),
      ]);

      // Generate tokens
      const [jwt, refreshToken] = await Promise.all([
        JwtHelper.signToken(account),
        JwtHelper.refreshJWT(account),
      ]);

      // Send welcome email
      emitEvent("send:general:email", {
        to: account.primaryEmail,
        subject: `🎉 Welcome to ${process.env.APP_NAME}! Let's Get Started!`,
        username: account.primaryEmail.split("@")[0],
        appName: process.env.APP_NAME,
        featureLink: process.env.CLIENT_URL,
        profileLink: `${process.env.CLIENT_URL}/settings`,
        communityLink: process.env.TELEGRAM_COMMUNITY_URL,
        socialMediaLink: process.env.X_URL,
        supportEmail: process.env.EMAIL_USERNAME,
      }).catch((err: any) => {
        console.error("Error emitting send:general:email event:", err.message);
      });

      // Send verification email if not verified
      if (!validatedDetails.isEmailVerified) {
        emitEvent("send:otp:email", {
          to: account.primaryEmail,
          subject: "Verify Your Email",
          content: "Kindly use this code to verify your email",
          code: otp,
          username: account.username,
        }).catch((err: any) => {
          console.error("Error emitting send:otp:email event:", err.message);
        });
      }

      return {
        status: httpStatus.CREATED,
        data: {
          user: account,
          token: jwt,
          refreshToken,
        },
        success: true,
        message: "User created successfully",
      };
    } catch (error: any) {
      console.error("Error validating user:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as ValidateUserData,
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
          data: {} as ValidateUserData,
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as ValidateUserData,
        success: false,
        message: "Error validating user",
      };
    }
  }

  async forgotPassword(
    req: Request
  ): Promise<ServiceResponse<ForgotPasswordData>> {
    try {
      // SECURITY: Validate request body with Zod
      const validatedBody = ForgotPasswordSchema.parse(req.body);

      // SECURITY: Sanitize email
      const sanitizedEmail = sanitizeInput(validatedBody.email);

      // Validate email format
      if (!EmailHelper.isValidEmail(sanitizedEmail)) {
        return {
          status: httpStatus.NOT_ACCEPTABLE,
          data: {} as ForgotPasswordData,
          success: false,
          message: "Invalid email format",
        };
      }

      // Find user
      const user = await User.findOne(
        { primaryEmail: sanitizedEmail },
        "primaryEmail username"
      )
        .select("-password -encryptedPrivateKey")
        .lean();

      if (!user) {
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as ForgotPasswordData,
          success: false,
          message: "Email not found",
        };
      }

      // Generate and store OTP
      const token = Helpers.generateOTP(4);
      await internalCacheService.set(String(token), user._id, 18000);

      // Send OTP email
      emitEvent("send:otp:email", {
        to: user.primaryEmail,
        subject: "Forgot Password",
        content: "Kindly use this code to reset your password",
        code: token,
        username: user.username,
      }).catch((err: any) => {
        console.error("Error emitting send:otp:email event:", err.message);
      });

      return {
        status: httpStatus.OK,
        data: { success: true },
        success: true,
        message: "Forgot password OTP sent to your email.",
      };
    } catch (error: any) {
      console.error("Error processing forgot password:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as ForgotPasswordData,
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
          data: {} as ForgotPasswordData,
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as ForgotPasswordData,
        success: false,
        message: "Error processing forgot password",
      };
    }
  }

  async resendForgotPasswordOTP(
    req: Request
  ): Promise<ServiceResponse<ResendOTPData>> {
    try {
      // SECURITY: Validate request body with Zod
      const validatedBody = ResendOTPSchema.parse(req.body);

      // SECURITY: Sanitize email
      const sanitizedEmail = sanitizeInput(validatedBody.email);

      // Validate email format
      if (!EmailHelper.isValidEmail(sanitizedEmail)) {
        return {
          status: httpStatus.NOT_ACCEPTABLE,
          data: {} as ResendOTPData,
          success: false,
          message: "Invalid email format",
        };
      }

      // Find user
      const user = await User.findOne({ primaryEmail: sanitizedEmail })
        .select("-password -encryptedPrivateKey")
        .lean();

      if (!user) {
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as ResendOTPData,
          success: false,
          message: "Email not found",
        };
      }

      // Generate and store new OTP
      const otp = Helpers.generateOTP(4);
      await internalCacheService.set(String(otp), user._id, 5000);

      // Send OTP email
      emitEvent("send:otp:email", {
        to: user.primaryEmail,
        subject: "Forgot Password",
        content: "Kindly use this code to reset your password",
        code: otp,
        username: user.username,
      }).catch((err: any) => {
        console.error("Error emitting send:otp:email event:", err.message);
      });

      return {
        status: httpStatus.OK,
        data: { success: true },
        success: true,
        message: "Forgot password OTP resent to your email.",
      };
    } catch (error: any) {
      console.error("Error resending forgot password OTP:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as ResendOTPData,
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
          data: {} as ResendOTPData,
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as ResendOTPData,
        success: false,
        message: "Error resending forgot password OTP",
      };
    }
  }

  async verifyEmail(req: Request): Promise<ServiceResponse<VerifyEmailData>> {
    try {
      // SECURITY: Validate request body with Zod
      const validatedBody = VerifyEmailSchema.parse(req.body);

      // SECURITY: Sanitize OTP
      const sanitizedOtp = sanitizeInput(validatedBody.otp);

      // Get stored OTP from cache
      const redisObject = await internalCacheService.get(sanitizedOtp);

      if (!redisObject) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as VerifyEmailData,
          success: false,
          message: "Invalid or expired OTP",
        };
      }

      // Find user
      const user = await User.findById(redisObject)
        .select("-password -encryptedPrivateKey")
        .lean();

      if (!user) {
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as VerifyEmailData,
          success: false,
          message: "User not found",
        };
      }

      // Check if already verified
      if (user.isEmailVerified) {
        return {
          status: httpStatus.CONFLICT,
          data: {} as VerifyEmailData,
          success: false,
          message: "Email is already verified",
        };
      }

      // Update verification status and delete OTP
      await Promise.all([
        User.findByIdAndUpdate(
          user._id,
          { $set: { isEmailVerified: true } },
          { new: true }
        ),
        internalCacheService.delete(sanitizedOtp),
      ]);

      return {
        status: httpStatus.OK,
        data: { success: true },
        success: true,
        message: "Email verified successfully.",
      };
    } catch (error: any) {
      console.error("Error verifying email:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as VerifyEmailData,
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
          data: {} as VerifyEmailData,
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as VerifyEmailData,
        success: false,
        message: "Error verifying email",
      };
    }
  }

  async resendEmailVerificationOTP(
    req: Request
  ): Promise<ServiceResponse<ResendOTPData>> {
    try {
      // SECURITY: Validate request body with Zod
      const validatedBody = ResendOTPSchema.parse(req.body);

      // SECURITY: Sanitize email
      const sanitizedEmail = sanitizeInput(validatedBody.email);

      // Validate email format
      if (!EmailHelper.isValidEmail(sanitizedEmail)) {
        return {
          status: httpStatus.NOT_ACCEPTABLE,
          data: {} as ResendOTPData,
          success: false,
          message: "Invalid email format",
        };
      }

      // Find user
      const user = await User.findOne({ primaryEmail: sanitizedEmail })
        .select("-password -encryptedPrivateKey")
        .lean();

      if (!user) {
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as ResendOTPData,
          success: false,
          message: "Email not found",
        };
      }

      // Check if already verified
      if (user.isEmailVerified) {
        return {
          status: httpStatus.CONFLICT,
          data: {} as ResendOTPData,
          success: false,
          message: "Email is already verified",
        };
      }

      // Generate and store new OTP
      const otp = Helpers.generateOTP(4);
      await internalCacheService.set(String(otp), user._id, 5000);

      // Send OTP email
      emitEvent("send:otp:email", {
        to: user.primaryEmail,
        subject: "Verify Your Email",
        content: "Kindly use this code to verify your email",
        code: otp,
        username: user.username,
      }).catch((err: any) => {
        console.error("Error emitting send:otp:email event:", err.message);
      });

      return {
        status: httpStatus.OK,
        data: { success: true },
        success: true,
        message: "Email verification OTP resent to your email.",
      };
    } catch (error: any) {
      console.error("Error resending email verification OTP:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as ResendOTPData,
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
          data: {} as ResendOTPData,
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as ResendOTPData,
        success: false,
        message: "Error resending email verification OTP",
      };
    }
  }

  async resetPassword(
    req: Request
  ): Promise<ServiceResponse<ResetPasswordData>> {
    try {
      // SECURITY: Validate request body with Zod
      const validatedBody = ResetPasswordSchema.parse(req.body);

      // SECURITY: Sanitize all inputs
      const sanitizedEmail = EmailHelper.format(
        sanitizeInput(validatedBody.email)
      );
      const sanitizedOtp = sanitizeInput(validatedBody.otp);
      const sanitizedPassword = sanitizeInput(validatedBody.password);

      // Validate email format
      if (!EmailHelper.isValidEmail(sanitizedEmail)) {
        return {
          status: httpStatus.NOT_ACCEPTABLE,
          data: {} as ResetPasswordData,
          success: false,
          message: "Invalid email format",
        };
      }

      // Get stored OTP from cache
      const redisObject = await internalCacheService.get(sanitizedOtp);

      if (!redisObject) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as ResetPasswordData,
          success: false,
          message: "Invalid or expired OTP",
        };
      }

      // Find user with encryptedPrivateKey (important!)
      const user: any = await User.findById(redisObject).lean();

      if (!user) {
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as ResetPasswordData,
          success: false,
          message: "User not found",
        };
      }

      // Verify email matches
      if (user.primaryEmail !== sanitizedEmail) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as ResetPasswordData,
          success: false,
          message: "Invalid account",
        };
      }

      // 1. FIRST: Decrypt the wallet private key using OLD credentials
      let decryptedPrivateKey: string;
      try {
        // Use the current (old) password and pinCode for decryption
        decryptedPrivateKey = WalletDecryption.decryptPrivateKey(
          user.encryptedPrivateKey,
          `${user.primaryEmail}${user.password}${user.pinCode}`
        );
      } catch (decryptError) {
        console.error("Failed to decrypt wallet:", decryptError);
        return {
          status: httpStatus.INTERNAL_SERVER_ERROR,
          data: {} as ResetPasswordData,
          success: false,
          message: "Failed to decrypt wallet. Please contact support.",
        };
      }

      // 2. Hash the NEW password
      const hashedPassword = bcrypt.hashSync(sanitizedPassword, 8);

      // 3. Re-encrypt the wallet private key with NEW credentials
      let newEncryptedPrivateKey: string;
      try {
        newEncryptedPrivateKey = WalletEncryption.encryptPrivateKey(
          decryptedPrivateKey,
          `${user.primaryEmail}${hashedPassword}${user.pinCode}`
        );
      } catch (encryptError) {
        console.error("Failed to re-encrypt wallet:", encryptError);
        return {
          status: httpStatus.INTERNAL_SERVER_ERROR,
          data: {} as ResetPasswordData,
          success: false,
          message: "Failed to secure wallet with new password.",
        };
      }

      // 4. Update user with new password AND new encrypted private key
      await User.findByIdAndUpdate(
        user._id,
        {
          $set: {
            password: hashedPassword,
            encryptedPrivateKey: newEncryptedPrivateKey,
          },
        },
        { new: true }
      );

      // 5. Delete OTP from cache
      await internalCacheService.delete(sanitizedOtp);

      // OPTIONAL: Invalidate user sessions/tokens
      // await tokenService.revokeAllUserTokens(user._id);

      return {
        status: httpStatus.OK,
        data: { success: true },
        success: true,
        message: "Password reset successfully. Your wallet remains accessible.",
      };
    } catch (error: any) {
      console.error("Error resetting password:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as ResetPasswordData,
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
          data: {} as ResetPasswordData,
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as ResetPasswordData,
        success: false,
        message: "Error resetting password",
      };
    }
  }
}

// Create and export service instance
export const authService = new AuthService();
