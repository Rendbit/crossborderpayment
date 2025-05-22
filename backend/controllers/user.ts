import * as bcrypt from "bcryptjs";
import { User } from "../models/User";
import { PaginationQuerySchema } from "../validators/pagination";
import { Referral } from "../models/Referral";
import { Task } from "../models/Task";
import { TaskEnum } from "../common/enums/referralProgram/task.enum";
import { UserTask } from "../models/UserTask";
import httpStatus from "http-status";
import {
  WalletDecryption,
  WalletEncryption,
} from "../helpers/encryption-decryption.helper";
import { Helpers } from "../helpers";

export const getUserProfile = async (req: any, res: any) => {
  try {
    const user = req.user;
    const account = await User.findById(user._id)
      .select("-password -encryptedPrivateKey")
      .lean();

    if (!account) throw new Error("Account not found.");
    return res.status(httpStatus.OK).json({
      data: account,
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    console.log("Error fetching profile details.", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error fetching profile details.",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};

export const createPassword = async (req: any, res: any) => {
  try {
    const { password } = req.body;
    const user = req.user;
    await User.findByIdAndUpdate(user._id, {
      $set: {
        password: bcrypt.hashSync(password, 8),
        isPassword: true,
      },
    })
      .select("-password -encryptedPrivateKey")
      .lean();
    return res.status(httpStatus.OK).json({
      data: null,
      status: httpStatus.OK,
      message: "Password created successfully",
      success: true,
    });
  } catch (error: any) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error creating password.",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};

export const getUserReferrals = async (req: any, res: any) => {
  try {
    const user = req.user;
    const parsedQuery = PaginationQuerySchema.parse(req.query);
    const limit = Number(parsedQuery.limit) || 10;
    const page = Number(parsedQuery.page) || 1;
    const skip = (page - 1) * limit;

    const [referrals, count] = await Promise.all([
      Referral.find({ referredBy: user._id }, "-_id referredUser xp")
        .populate("referredUser", "userProfileUrl username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Referral.countDocuments({
        referredBy: user._id,
      }),
    ]);

    return res.status(httpStatus.OK).json({
      data: { referrals, count },
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error fetching referrals.",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};

export const getReferralLeaderBoard = async (req: any, res: any) => {
  try {
    const parsedQuery = PaginationQuerySchema.parse(req.query);
    const limit = Number(parsedQuery.limit) || 10;
    const page = Number(parsedQuery.page) || 1;
    const skip = (page - 1) * limit;

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
      { $limit: limit },
    ]);

    return res.status(httpStatus.OK).json({
      data: { leaderboard },
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error fetching leaderboard.",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};

export const updateProfile = async (req: any, res: any) => {
  try {
    const user = req.user;
    const { username, country } = req.body;

    const updatedProfile = await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          username: username || user.username,
          country: country || user.country,
        },
      },
      { new: true }
    )
      .select("-password -encryptedPrivateKey")
      .lean();

    const task = await Task.findOne({ name: TaskEnum.CompleteProfileSetup });

    if (task) {
      await UserTask.create({
        user: user._id,
        task: task._id,
        completed: true,
      });

      const account = await User.findById(user._id).select(
        "-password -encryptedPrivateKey"
      );
      if (!account) throw new Error("Account not found.");

      user.xp += task.xp;
      await account.save();
    }

    return res.status(httpStatus.OK).json({
      data: updatedProfile,
      status: httpStatus.OK,
      message: "Profile updated successfully",
      success: true,
    });
  } catch (error: any) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error updating profile.",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};

export const updateProfileImage = async (req: any, res: any) => {
  try {
    const user = req.user;
    const { userProfileUrl } = req.body;

    const updatedProfile = await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          userProfileUrl: userProfileUrl || user.userProfileUrl,
        },
      },
      { new: true }
    )
      .select("-password -encryptedPrivateKey")
      .lean();

    return res.status(httpStatus.OK).json({
      data: updatedProfile,
      status: httpStatus.OK,
      message: "Profile image updated successfully",
      success: true,
    });
  } catch (error: any) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error updating profile image.",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};

export const changePassword = async (req: any, res: any) => {
  try {
    const { oldPassword, password } = req.body;
    const user = req.user;
    const strongRegexHigherCase = new RegExp("^(?=.*[A-Z])");
    const strongRegexLowerCase = new RegExp("^(?=.*[a-z])");
    const strongRegexNumber = new RegExp("^(?=.*[0-9])");
    const strongRegexSpecialCharacter = /^(.*\W).*$/;

    if (!bcrypt.compareSync(oldPassword, user.password))
      throw new Error("Invalid old password");

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

    if (user.encryptedPrivateKey) {
      const decryptedPrivateKey = WalletDecryption.decryptPrivateKey(
        user.encryptedPrivateKey,
        `${user.primaryEmail}${user.password}${user.pinCode}`
      );

      const updatedPassword = await User.findByIdAndUpdate(
        user._id,
        {
          $set: {
            password: bcrypt.hashSync(password, 8),
          },
        },
        { new: true }
      )
        .select("-encryptedPrivateKey")
        .lean();
      if (!updatedPassword) throw new Error("Failed to change password.");
      const hashedPasword = bcrypt.hashSync(password, 8);

      await User.findByIdAndUpdate(
        user._id,
        {
          $set: {
            password: hashedPasword,
            encryptedPrivateKey: WalletEncryption.encryptPrivateKey(
              decryptedPrivateKey,
              `${user.primaryEmail}${hashedPasword}${user.pinCode}`
            ),
          },
        },
        { new: true }
      )
        .select("-password -encryptedPrivateKey")
        .lean();
    }

    return res.status(httpStatus.OK).json({
      data: null,
      status: httpStatus.OK,
      message: "Password changed successfully",
      success: true,
    });
  } catch (error: any) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error changing password.",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};

export const exportPrivateKey = async (req: any, res: any) => {
  try {
    const user = req.user;
    const { pinCode } = req.body;

    if (!user.pinCode) throw new Error("Please create a pin code");
    if (pinCode !== user.pinCode) throw new Error("Invalid pin code");
    console.log(user.encryptedPrivateKey);
    const decryptedPrivateKey = WalletDecryption.decryptPrivateKey(
      user.encryptedPrivateKey,
      `${user.primaryEmail}${user.password}${pinCode}`
    );

    return res.status(httpStatus.OK).json({
      data: { privateKey: decryptedPrivateKey },
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error exporting private key.",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};
