import * as bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import StellarSdk from "stellar-sdk";
import { WalletEncryption } from "../helpers/encryption-decryption.helper";
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

const server =
  process.env.STELLAR_NETWORK === "public"
    ? new StellarSdk.Server(process.env.HORIZON_MAINNET_URL)
    : new StellarSdk.Server(process.env.HORIZON_TESTNET_URL);
const fundingKey =
  process.env.STELLAR_NETWORK === "public"
    ? StellarSdk.Keypair.fromSecret(process.env.FUNDING_KEY_SECRET)
    : StellarSdk.Keypair.fromSecret(process.env.FUNDING_TESTNET_KEY_SECRET);

export const login = async (req: any, res: any) => {
  try {
    let { email, password, code, captcha } = req.body;
    // Normalize email to lowercase for consistency
    email = EmailHelper.format(email);

    if (!EmailHelper.isValidEmail(email))
      return res.status(httpStatus.NOT_ACCEPTABLE).json({
        message: "Is not a valid work email",
        status: httpStatus.NOT_ACCEPTABLE,
        success: false,
        data: null,
      });

    // Query the UserModel to find the user with the provided email
    const [account, user] = await Promise.all([
      User.findOne(
        {
          primaryEmail: email,
        },
        "-encryptedPrivateKey"
      ).lean(),
      User.findOne(
        {
          primaryEmail: email,
        },
        "-encryptedPrivateKey -password"
      ).lean(),
    ]);

    if (!account) {
      return res.status(httpStatus.NOT_FOUND).json({
        message: "Account not found",
        status: httpStatus.NOT_FOUND,
        success: false,
        data: null,
      });
    }
    if (process.env.NODE_ENV === "production") {
      if (user && !user.isCaptchaVerified) {
        const response = await fetch(
          `${process.env.RECAPTCHA_BASE}?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captcha}`,
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencode;charset=utf-8",
            },
            method: "POST",
          }
        );

        if (!response.ok)
          return res.status(httpStatus.EXPECTATION_FAILED).json({
            message: "Failed to verify recaptcha. Try again",
            status: httpStatus.EXPECTATION_FAILED,
            success: false,
            data: null,
          });

        const resp = await response.json();

        if (!resp.success)
          return res.status(httpStatus.EXPECTATION_FAILED).json({
            message: "Recaptcha failed. Try again",
            status: httpStatus.EXPECTATION_FAILED,
            success: false,
            data: null,
          });

        await User.findOneAndUpdate(
          { primaryEmail: email },
          {
            $set: {
              isCaptchaVerified: true,
            },
          },
          { new: true }
        ).lean();
      }
    }

    // If user not found, throw BadRequestException
    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({
        message: "Account not found",
        status: httpStatus.NOT_FOUND,
        success: false,
        data: null,
      });
    }

    // Compare hashed password with provided password
    if (!account.password || !bcrypt.compareSync(password, account.password)) {
      return res.status(httpStatus.UNAUTHORIZED).json({
        message: "Invalid credential",
        status: httpStatus.UNAUTHORIZED,
        success: false,
        data: null,
      });
    }

    // Check MFA if set up and enabled
    const mfa = await MFA.findOne({
      user: account._id,
    }).lean();

    if (process.env.NODE_ENV === "production") {
      if (mfa && mfa.isSetup && mfa.isEnabled && !code) {
        return res.status(httpStatus.UNAUTHORIZED).json({
          message:
            "Multi-factor authentication required. Please provide your MFA code.",
          status: httpStatus.UNAUTHORIZED,
          success: false,
          data: null,
        });
      }

      if (mfa && mfa.isSetup && mfa.isEnabled && code) {
        // Verify MFA code
        const validate = authenticator.verify({
          token: code,
          secret: mfa.secret,
        });

        // If code is invalid, throw BadRequestException
        if (!validate) {
          return res.status(httpStatus.UNAUTHORIZED).json({
            message: "Invalid MFA code",
            status: httpStatus.UNAUTHORIZED,
            success: false,
            data: null,
          });
        }
      }
    }

    // Sign JWT token and refresh token for the user
    const jwt = await JwtHelper.signToken(user);
    const refreshToken = await JwtHelper.refreshJWT(user);
    await User.findOneAndUpdate(
      { primaryEmail: email },
      {
        $set: {
          isCaptchaVerified: false,
        },
      },
      { new: true }
    ).lean();
    // Return user data with tokens
    return res.status(httpStatus.OK).json({
      data: {
        ...user,
        token: jwt,
        refreshToken,
      },
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    console.log("Error loggin in: ", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error loggin in.",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      data: null,
    });
  }
};

export const authorizeRefreshToken = async (req: any, res: any) => {
  try {
    const user = req.user;
    // Fetch user data from UserModel based on account ID
    const account = await User.findById(
      user._id,
      "-encryptedPrivateKey -password"
    ).lean();

    if (!account) {
      return res
        .status(httpStatus.NOT_FOUND)
        .status(httpStatus.NOT_FOUND)
        .json({
          message: "Account not found.",
          status: httpStatus.NOT_FOUND,
          success: false,
          data: null,
        });
    }

    // Generate new JWT token and refresh token for the user
    const jwt = await JwtHelper.signToken(user);
    const refreshToken = await JwtHelper.refreshJWT(user);

    // Return updated user data with new tokens
    return res
      .status(httpStatus.OK)
      .status(httpStatus.OK)
      .json({
        data: {
          ...account,
          token: jwt,
          refreshToken,
        },
        status: httpStatus.OK,
        success: true,
      });
  } catch (error: any) {
    console.log("Error authorizing refresh token: ", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error authorizing refresh token.",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      data: null,
    });
  }
};

export const requestEmailValidation = async (req: any, res: any) => {
  try {
    let { email } = req.body;
    email = EmailHelper.format(email);

    if (!EmailHelper.isValidEmail(email))
      return res.status(httpStatus.NOT_ACCEPTABLE).json({
        message: "Is not a valid work email",
        status: httpStatus.NOT_ACCEPTABLE,
        success: false,
        data: null,
      });

    const findEmail = await User.findOne(
      { primaryEmail: email },
      "-encryptedPrivateKey -password"
    ).lean();
    if (findEmail)
      return res
        .status(httpStatus.CONFLICT)
        .json({ message: "Email taken", status: httpStatus.CONFLICT });

    const otp = Helpers.generateOTP(4);
    await internalCacheService.set(email, otp, 18000);

    // Return success if email validation request is processed
    return res.status(httpStatus.OK).json({
      data: null,
      message: "Email validation OTP sent to your email.",
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    console.log("Error validating email", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error validating email",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      data: null,
    });
  }
};

export const register = async (req: any, res: any) => {
  let { email, password, referralCode } = req.body;
  email = EmailHelper.format(email);

  if (!EmailHelper.isValidEmail(email))
    return res.status(httpStatus.NOT_ACCEPTABLE).json({
      message: "Is not a valid work email",
      status: httpStatus.NOT_ACCEPTABLE,
      success: false,
      data: null,
    });

  const strongRegexHigherCase = new RegExp("^(?=.*[A-Z])");
  const strongRegexLowerCase = new RegExp("^(?=.*[a-z])");
  const strongRegexNumber = new RegExp("^(?=.*[0-9])");
  const strongRegexSpecialCharacter = /^(.*\W).*$/;
  // Check if email is already associated with an existing user
  const foundEmail = await User.findOne(
    {
      primaryEmail: email,
    },
    "-encryptedPrivateKey -password"
  ).lean();

  if (foundEmail) {
    res
      .status(httpStatus.CONFLICT)
      .json({ message: "Email taken", status: httpStatus.CONFLICT });
  }

  if (!password) {
    return res.status(httpStatus.UNAUTHORIZED).json({
      message: "Provide a password.",
      status: httpStatus.UNAUTHORIZED,
      success: false,
      data: null,
    });
  }

  if (!Helpers.validateLength(password, 8, 40)) {
    return res.status(httpStatus.UNAUTHORIZED).json({
      message: "Password must be atleast 8 characters.",
      status: httpStatus.UNAUTHORIZED,
      success: false,
      data: null,
    });
  }

  if (!strongRegexHigherCase.test(password)) {
    return res.status(httpStatus.UNAUTHORIZED).json({
      message: "Password must contain an uppercase.",
      status: httpStatus.UNAUTHORIZED,
      success: false,
      data: null,
    });
  }

  if (!strongRegexLowerCase.test(password)) {
    return res.status(httpStatus.UNAUTHORIZED).json({
      message: "Password must contain a lowercase.",
      status: httpStatus.UNAUTHORIZED,
      success: false,
      data: null,
    });
  }

  if (!strongRegexNumber.test(password)) {
    return res.status(httpStatus.UNAUTHORIZED).json({
      message: "Password must contain a number.",
      status: httpStatus.UNAUTHORIZED,
      success: false,
      data: null,
    });
  }

  if (!strongRegexSpecialCharacter.test(password)) {
    return res.status(httpStatus.UNAUTHORIZED).json({
      message: "Password must contain a special character.",
      status: httpStatus.UNAUTHORIZED,
      success: false,
      data: null,
    });
  }

  try {
    // Generate referral code, hash password, and create new user
    const userReferralCode = Helpers.generateOTP(7);

    const user = await new User({
      primaryEmail: email,
      password: bcrypt.hashSync(password, 8),
      username: email.split("@")[0],
      referralCode: `rb-${userReferralCode}`,
    }).save();

    // Check if user creation was successful
    const account = await User.findOne(
      {
        primaryEmail: user.primaryEmail,
      },
      "-encryptedPrivateKey -password"
    ).lean();

    if (!account) {
      return res.status(httpStatus.NOT_FOUND).json({
        message: "Account not found.",
        status: httpStatus.NOT_FOUND,
        success: false,
        data: null,
      });
    }

    if (account) {
      await new UserSetting({ user: account._id }).save();
    }

    if (referralCode) {
      const referredBy = await User.findOne(
        { referralCode: referralCode.toUpperCase() },
        "xp"
      );
      if (!referredBy) {
        return res.status(httpStatus.NOT_FOUND).json({
          message: "Referral code does not exist",
          status: httpStatus.NOT_FOUND,
          success: false,
          data: null,
        });
      }

      // create referral
      await new Referral({
        referredBy: referredBy._id,
        referredUser: account._id,
        xp: 50,
      }).save();

      // create user task model
      const task = await Task.findOne({ name: TaskEnum.ReferAFriend }).lean();
      if (task) {
        await UserTask.create({
          user: referredBy._id,
          task: task._id,
          completed: true,
        });
        if (referredBy && referredBy.xp !== undefined) {
          referredBy.xp = (referredBy.xp ?? 0) + 50;
        }
        await referredBy.save();
      } else {
        referredBy.xp = (referredBy.xp ?? 0) + 50;
        await referredBy.save();
      }
    }

    // Generate OTP for email verification and set it in the internal cache service
    const otp = Helpers.generateOTP(4);
    console.log(account._id);
    await internalCacheService.set(String(otp), account._id, 1000);

    // Sign JWT token and refresh token for the user
    const [jwt, refreshToken] = await Promise.all([
      JwtHelper.signToken(account),
      JwtHelper.refreshJWT(account),
    ]);

    // Send email notifications for account creation and email verification

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
    emitEvent("send:otp:email", {
      to: account.primaryEmail,
      subject: "Verify Your Email",
      content: "Kindly use this code to verify your email",
      code: otp,
      username: account.username,
    }).catch((err: any) => {
      console.error("Error emitting send:otp:email event:", err.message);
    });

    // Return user data with tokens upon successful registration
    return res.status(httpStatus.CREATED).json({
      data: {
        ...account,
        token: jwt,
        refreshToken,
      },
      status: httpStatus.CREATED,
      success: true,
    });
  } catch (error: any) {
    console.log("Error registering", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error registering",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      data: null,
    });
  }
};

export const validateUser = async (details: any) => {
  try {
    const user = await User.findOne(
      { primaryEmail: details.email },
      "-encryptedPrivateKey -password"
    ).lean();

    if (user) {
      const jwt = await JwtHelper.signToken(user);
      const refreshToken = await JwtHelper.refreshJWT(user);
      // Return user data with tokens
      return {
        data: {
          ...user,
          token: jwt,
          refreshToken,
        },
      };
    }
    const referralCode = Helpers.generateOTP(7);
    const otp = Helpers.generateOTP(4);

    const newUser = await new User({
      primaryEmail: details.email,
      isPassword: false,
      password: bcrypt.hashSync(`${otp + details.email}`, 8),
      username: details.email.split("@")[0],
      userProfileUrl: details.userProfileUrl,
      isEmailVerified: details.isEmailVerified,
      referralCode: referralCode,
    }).save();

    // Check if newUser creation was successful
    const account = await User.findOne(
      {
        primaryEmail: newUser.primaryEmail,
      },
      "-encryptedPrivateKey -password"
    ).lean();

    if (!account) {
      throw new Error("Account not found");
    }
    await Promise.all([
      new UserSetting({ user: account._id }).save(), // Save user settings
      internalCacheService.set(String(otp), account._id, 1000),
    ]);

    // Generate OTP for email verification and set it in the internal cache service

    // Sign JWT token and refresh token for the user
    const [jwt, refreshToken] = await Promise.all([
      JwtHelper.signToken(account),
      JwtHelper.refreshJWT(account),
    ]);

    // Send email notifications for account creation and email verification

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

    if (!details.isEmailVerified)
      emitEvent("send:otp:email", {
        to: account.primaryEmail,
        subject: "Verify Your Email",
        content: `Kindly use this code to verify your email`,
        code: otp,
        username: account.username,
      }).catch((err: any) => {
        console.error("Error emitting send:otp:email event:", err.message);
      });

    // Return user data with tokens upon successful registration
    return {
      data: {
        ...account,
        token: jwt,
        refreshToken,
      },
    };
  } catch (error: any) {
    console.log("Error validating user", error);
    throw new Error("Error validating user");
  }
};

export const createWallet = async (req: any, res: any) => {
  try {
    const user = req.user;
    const { pinCode } = req.body;

    // 👉 Check first: if user already has a wallet, do nothing else
    if (user.stellarPublicKey) {
      return res.status(httpStatus.CONFLICT).json({
        message: "You already have a wallet.",
        status: httpStatus.CONFLICT,
        success: false,
        data: null,
      });
    }

    // ✅ Now safe to proceed: generate a new Stellar keypair
    const keypair = StellarSdk.Keypair.random();

    // ✅ Fund the account depending on network
    // if (process.env.STELLAR_NETWORK !== "public") {
    //   await fundWithFriendbot(keypair.publicKey());
    // } else {
    //   await fundAccount(keypair.publicKey());
    // }

    // ✅ Encrypt and save wallet to user
    const hashedPasword = user.password;
    const [_user, account] = await Promise.all([
      User.findById(user._id).lean(),
      User.findByIdAndUpdate(
        user._id,
        {
          $set: {
            stellarPublicKey: keypair.publicKey(),
            encryptedPrivateKey: WalletEncryption.encryptPrivateKey(
              keypair.secret(),
              `${user.primaryEmail}${hashedPasword}${pinCode}`
            ),
            pinCode: pinCode,
          },
        },
        { new: true }
      )
        .select("-password -encryptedPrivateKey")
        .lean(),
    ]);

    const jwt = await JwtHelper.signToken(user);
    const refreshToken = await JwtHelper.refreshJWT(user);

    // ✅ Return the wallet and tokens
    return res.status(httpStatus.OK).json({
      data: {
        ...account,
        publicKey: keypair.publicKey(),
        token: jwt,
        refreshToken,
      },
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    console.log("Error creating wallet", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error creating wallet",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      data: null,
    });
  }
};

export const fundWithFriendbot = async (publicKey: string) => {
  try {
    const response = await fetch(
      `https://friendbot.stellar.org?addr=${publicKey}`
    );
    if (!response.ok) {
      throw new Error(`Error funding account: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Error funding account with friend bot", error);
    throw new Error("Error funding account with friend bot");
  }
};

export const fundAccount = async (destination: string) => {
  try {
    // Load the funding account and fetch base fee for the transaction
    const account = await server.loadAccount(fundingKey.publicKey());
    const fee = await server.fetchBaseFee();

    // Create a transaction to fund the account with starting balance
    const transaction = await new StellarSdk.TransactionBuilder(account, {
      fee,
      networkPassphrase:
        process.env.STELLAR_NETWORK === "public"
          ? StellarSdk.Networks.PUBLIC
          : StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.createAccount({
          destination,
          startingBalance: "5",
        })
      )
      .setTimeout(30)
      .build();

    // Sign and submit the transaction to the Stellar network
    await transaction.sign(fundingKey);
    const transactionResult = await server.submitTransaction(transaction);

    // Return the transaction result
    return transactionResult;
  } catch (error) {
    console.log("Error funding account", error);
    throw new Error("Error funding account");
  }
};

export const forgotPassword = async (req: any, res: any) => {
  try {
    let { email } = req.body;
    if (!EmailHelper.isValidEmail(email)) {
      return res.status(httpStatus.NOT_ACCEPTABLE).json({
        message: "Is not a valid work email",
        status: httpStatus.NOT_ACCEPTABLE,
        success: false,
        data: null,
      });
    }
    // Find user by email and retrieve email and username
    const user = await User.findOne(
      {
        primaryEmail: email,
      },
      "primaryEmail username"
    )
      .select("-password -encryptedPrivateKey")
      .lean();

    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({
        message: "Account not found",
        status: httpStatus.NOT_FOUND,
        success: false,
        data: null,
      });
    }

    // Generate OTP and set it in the internal cache service
    const token = Helpers.generateOTP(4);
    await internalCacheService.set(String(token), user._id, 18000);

    // Send OTP email notification for password reset
    emitEvent("send:otp:email", {
      to: user.primaryEmail,
      subject: "Forgot Password",
      content: `Kindly use this code to reset your password`,
      code: token,
      username: user.username,
    }).catch((err: any) => {
      console.error("Error emitting send:otp:email event:", err.message);
    });

    return res.status(httpStatus.OK).json({
      data: null,
      message: "Forgot password OTP send to your email.",
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    console.log("Error sending forgot password OTP", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error sending forgot password OTP",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      data: null,
    });
  }
};

export const resendForgotPasswordOTP = async (req: any, res: any) => {
  try {
    let { email } = req.body;
    if (!EmailHelper.isValidEmail(email)) {
      return res.status(httpStatus.NOT_ACCEPTABLE).json({
        message: "Is not a valid work email",
        status: httpStatus.NOT_ACCEPTABLE,
        success: false,
        data: null,
      });
    }
    // Find user by email
    const user = await User.findOne({ primaryEmail: email })
      .select("-password -encryptedPrivateKey")
      .lean();

    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({
        message: "Account not found",
        status: httpStatus.NOT_FOUND,
        success: false,
        data: null,
      });
    }

    // Generate new OTP and set it in the internal cache service
    const otp = Helpers.generateOTP(4);
    await internalCacheService.set(String(otp), user._id, 5000);

    // Send OTP email notification for password reset
    emitEvent("send:otp:email", {
      to: user.primaryEmail,
      subject: "Forgot Password",
      content: `Kindly use this code to reset your password`,
      code: otp,
      username: user.username,
    }).catch((err: any) => {
      console.error("Error emitting send:otp:email event:", err.message);
    });

    return res.status(httpStatus.OK).json({
      data: null,
      message: "Forgot password OTP resent to your email.",
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    console.log("Error resending forgot password OTP", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error resending forgot password OTP",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      data: null,
    });
  }
};

export const verifyEmail = async (req: any, res: any) => {
  try {
    const { otp } = req.body;
    // Retrieve OTP from internal cache service
    const redisObject: string | null | undefined =
      await internalCacheService.get(otp);

    console.log({ redisObject });

    if (!redisObject) {
      return res.status(httpStatus.UNAUTHORIZED).json({
        message: "Invalid OTP",
        status: httpStatus.UNAUTHORIZED,
        success: false,
        data: null,
      });
    }

    // Find user by ID and check email verification status
    const user = await User.findById(redisObject)
      .select("-password -encryptedPrivateKey")
      .lean();

    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({
        message: "Account not found",
        status: httpStatus.NOT_FOUND,
        success: false,
        data: null,
      });
    }

    if (user.isEmailVerified) {
      return res.status(httpStatus.CONFLICT).json({
        message: "Email is already verified",
        status: httpStatus.CONFLICT,
        success: false,
        data: null,
      });
    }

    await Promise.all([
      User.findByIdAndUpdate(
        user._id,
        {
          $set: {
            isEmailVerified: true,
          },
        },
        { new: true }
      ),
      internalCacheService.delete(otp),
    ]);

    return res.status(httpStatus.OK).json({
      data: null,
      message: "Email verified successfully.",
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    console.log("Error verifying email", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error verifying email",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      data: null,
    });
  }
};

export const resendEmailVerificationOTP = async (req: any, res: any) => {
  try {
    let { email } = req.body;
    if (!EmailHelper.isValidEmail(email)) {
      return res.status(httpStatus.NOT_ACCEPTABLE).json({
        message: "Is not a valid work email",
        status: httpStatus.NOT_ACCEPTABLE,
        success: false,
        data: null,
      });
    }
    // Find user by email
    const user = await User.findOne({ primaryEmail: email })
      .select("-password -encryptedPrivateKey")
      .lean();

    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({
        message: "Email not found",
        status: httpStatus.NOT_FOUND,
        success: false,
        data: null,
      });
    }

    // Generate new OTP and set it in the internal cache service
    const otp = Helpers.generateOTP(4);
    await internalCacheService.set(String(otp), user._id, 5000);
    // Send OTP email notification for email verification
    emitEvent("send:otp:email", {
      to: user.primaryEmail,
      subject: "Verify Your Email",
      content: `Kindly use this code to verify your email`,
      code: otp,
      username: user.username,
    }).catch((err: any) => {
      console.error("Error emitting send:otp:email event:", err.message);
    });

    return res.status(httpStatus.OK).json({
      data: null,
      message: "Email validation OTP resent to your email.",
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    console.log("Error resending email verification OTP", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error resending email verification OTP",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      data: null,
    });
  }
};

export const resetPassword = async (req: any, res: any) => {
  try {
    let { email, otp, password } = req.body;
    email = email.toLowerCase();
    if (!EmailHelper.isValidEmail(email)) {
      return res.status(httpStatus.NOT_ACCEPTABLE).json({
        message: "Is not a valid work email",
        status: httpStatus.NOT_ACCEPTABLE,
        success: false,
        data: null,
      });
    }

    const redisObject: string | null | undefined =
      await internalCacheService.get(otp);

    if (!redisObject)
      return res.status(httpStatus.UNAUTHORIZED).json({
        message: "Invalid OTP",
        status: httpStatus.UNAUTHORIZED,
        success: false,
        data: null,
      });

    // Find user by ID and check email match
    const user = await User.findById(redisObject)
      .select("-password -encryptedPrivateKey")
      .lean();

    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({
        message: "Account not found",
        status: httpStatus.NOT_FOUND,
        success: false,
        data: null,
      });
    }
    if (user.primaryEmail !== email) {
      return res.status(httpStatus.UNAUTHORIZED).json({
        message: "Invalid Account",
        status: httpStatus.UNAUTHORIZED,
        success: false,
        data: null,
      });
    }

    // Update password with bcrypt hash
    await User.findOneAndUpdate(
      {
        _id: user._id,
        primaryEmail: email,
      },
      {
        $set: {
          password: bcrypt.hashSync(password, 8),
        },
      },
      { new: true }
    );

    // Delete the OTP from internal cache service
    await internalCacheService.delete(otp);

    return res.status(httpStatus.OK).json({
      data: null,
      message: "Password reset successfully.",
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    console.log("Error resetting password", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error resetting password",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      data: null,
    });
  }
};
