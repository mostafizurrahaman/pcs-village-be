/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AuthRoles,
  AuthStatus,
  Branch,
  DutyStation,
  GroupMember,
  MembershipStatus,
  Otp,
  otpTypes,
  User,
  UserProfile,
  type IUser,
  type TKidsAgeRange,
} from "@repo/db";
import type {
  IAppleLoginType,
  IChangedPasswordType,
  IForgotPasswordType,
  IGoogleLoginType,
  ILoginType,
  IOAuthLoginType,
  IResendSignupType,
  IResetPasswordOtpType,
  ISignUpSchemaType,
  IVerifyResetPasswordOtpType,
  IVerifySignupOtpType,
} from "./user.validations";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import appleSignin from "apple-signin-auth";
import {
  addTime,
  AppError,
  comparePassword,
  createToken,
  generateOtp,
  GLOBAL_MESSAGES,
  hashPassword,
  verifyToken,
  type IJwtUserPayload,
} from "@repo/shared";
// import { sendEmail } from '@repo/email-sender'
import httpStatus from "http-status";
import configs from "@app/configs";
import mongoose, { Types } from "mongoose";
import {
  renderEmail,
  ResetPasswordOTPEmail,
  SignupOTPEmail,
} from "@repo/email-templates";
import { sendEmail } from "@repo/email-sender";
import { uploadSingleFileToS3 } from "@repo/media-hub";
import { groupServices } from "../Group/group.services";

// 1. Signup
const signUp = async (
  payload: ISignUpSchemaType,
  profileImage?: Express.Multer.File,
) => {
  const {
    name,
    email,
    password,

    // profile fields:
    branch,
    affiliation,
    interestTags,
    kidsAgeRanges,
    currentStation,
    futureStation,
    estimatedPcsDate,
  } = payload;

  // 1. Check existing user
  const existingUser = (await User.isUserExistByEmail(email)) as IUser;

  if (existingUser) {
    switch (existingUser.status) {
      case AuthStatus.ACTIVE:
        throw new AppError(
          httpStatus.CONFLICT,
          "An account with this email already exists. Please log in.",
        );

      case AuthStatus.PENDING:
        throw new AppError(
          httpStatus.CONFLICT,
          "Your account is not verified yet. Please verify your OTP.",
        );

      case AuthStatus.BLOCKED:
        throw new AppError(
          httpStatus.FORBIDDEN,
          "Your account has been blocked. Please contact support.",
        );

      case AuthStatus.DELETED:
        throw new AppError(
          httpStatus.GONE,
          "This account was deleted. Please contact support to restore it.",
        );

      default:
        throw new AppError(httpStatus.CONFLICT, "You already have an account.");
    }
  }

  // 2. Check is the branch exists:
  const existingBranch = await Branch.findById(branch);
  if (!existingBranch) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      GLOBAL_MESSAGES.BRANCH_NOT_FOUND,
    );
  }

  // 2. Check is station exists?:
  const currentStationExists = await DutyStation.findById(currentStation);
  if (!currentStationExists) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      `Current duty station doesn't exits!`,
    );
  }

  if (futureStation) {
    const futureStationExists = await DutyStation.findById(futureStation);
    if (!futureStationExists) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        `Future duty station doesn't exits!`,
      );
    }
  }

  // If has profile picture the upload and get the url:
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const uploadedImage = profileImage
      ? await uploadSingleFileToS3(profileImage, "profiles")
      : undefined;

    // 2. Hash password
    const hashedPassword = await hashPassword(
      password,
      configs.passwordSoltRound,
    );

    // 3. Create user (PENDING)
    const [newUser] = await User.create(
      [
        {
          name,
          email,
          password: hashedPassword,
          status: AuthStatus.PENDING,
          role: AuthRoles.USER,
          profileImage: uploadedImage?.url as string,
        },
      ],
      { session },
    );

    // Create User Profile :
    const profilePayload = {
      user: newUser?._id?.toString() as string,
      branch: existingBranch._id?.toString(),
      affiliation,
      interestTags: interestTags as string[],
      kidsAgeRanges: kidsAgeRanges as TKidsAgeRange[],
      currentStation,
      ...(futureStation && { futureStation }),
      ...(estimatedPcsDate && { estimatedPcsDate }),
    };

    await UserProfile.create([profilePayload], { session });

    if (!newUser?._id) {
      throw new AppError(httpStatus.BAD_REQUEST, "User creation failed!");
    }

    // 4. Generate OTP
    const otp = generateOtp({ length: configs.otpSettings.digits });

    // 5. Create OTP:
    const [savedOtp] = await Otp.create(
      [
        {
          user: newUser._id.toString(),
          type: otpTypes.SIGNUP,
          otp,
          expiresAt: addTime(configs.otpSettings.expiresIn, "minutes", true),
        },
      ],
      { session },
    );

    // 6. Render Signup Template:
    const htmlTemplate = await renderEmail(
      SignupOTPEmail({
        userFirstName: name,
        companyName: configs.site.name,
        companyLogo: configs.site.logo as string,
        otpCode: savedOtp?.otp as string,
      }),
    );

    // 7. Send OTP with rendered template
    await sendEmail({
      to: newUser.email,
      html: htmlTemplate.html,
      subject: "Your OTP for Account Verification",
    });

    // 8. Find or create group if it has new timeframe and type :
    const suggestedGroup = await groupServices.findOrCreateSuggestedGroup({
      userId: newUser?._id?.toString(),
      futureStationId: futureStation!,
      pcsDate: estimatedPcsDate!,
    });

    await session.commitTransaction();
    session.endSession();

    return {
      name: newUser.name,
      email: newUser.email,
      password: "",
      status: newUser.status,
      role: newUser.role,
      isTwoFactorEnabled: newUser.isTwoFactorEnabled,
      isOtpVerified: newUser.isOtpVerified,
      _id: newUser?._id,
      createdAt: newUser?.createdAt,
      updatedAt: newUser?.updatedAt,
      suggestedGroup: suggestedGroup?._id,
    };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new Error(error);
  }
};

// 2. Resend Signup otp:
const resendSignupOTP = async (payload: IResendSignupType) => {
  const { email } = payload;

  // 1. Check existing user
  const user = (await User.isUserExistByEmail(email)) as IUser;
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, `User Doesn't exits!`);
  }

  if (user.status === AuthStatus.BLOCKED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Your account has been blocked. Please contact support.",
    );
  }

  if (user.status === AuthStatus.DELETED) {
    throw new AppError(
      httpStatus.GONE,
      "This account was deleted. Please contact support to restore it.",
    );
  }

  if (user.isOtpVerified) {
    throw new AppError(httpStatus.CONFLICT, "Your account already verified!");
  }

  // 2. Check Otp exists ? :
  const existingOtp = await Otp.findValidOtp(
    user._id?.toString(),
    otpTypes.SIGNUP,
  );

  // 3. If existing otp still valid resend otp:
  if (existingOtp) {
    // Render Signup Template:
    const htmlTemplate = await renderEmail(
      SignupOTPEmail({
        userFirstName: user.name,
        companyName: configs.site.name,
        companyLogo: configs.site.logo as string,
        otpCode: existingOtp?.otp as string,
      }),
    );

    //  Send OTP with rendered template
    await sendEmail({
      to: user.email,
      html: htmlTemplate.html,
      subject: "Your OTP for Account Verification",
    });

    throw new AppError(
      httpStatus.BAD_REQUEST,
      "An OTP has already been sent and is still valid. Please check your email or wait for it to expire.",
    );
  }

  // 4. Generate new otp:
  const newOtp = generateOtp({ length: 6 });

  // 5. Create OTP:
  const savedOtp = await Otp.findOneAndUpdate(
    {
      user: user._id.toString(),
      type: otpTypes.SIGNUP,
    },
    {
      user: user._id.toString(),
      type: otpTypes.SIGNUP,
      otp: newOtp,
      expiresAt: addTime(configs.otpSettings.expiresIn, "minutes", true),
    },
    {
      new: true,
    },
  );

  // 6. Render Signup Template:
  const htmlTemplate = await renderEmail(
    SignupOTPEmail({
      userFirstName: user.name,
      companyName: configs.site.name,
      companyLogo: configs.site.logo as string,
      otpCode: savedOtp?.otp as string,
    }),
  );

  // 7. Send OTP with rendered template
  await sendEmail({
    to: user.email,
    html: htmlTemplate.html,
    subject: "Your OTP for Account Verification",
  });

  return {
    geneated: true,
  };
};

// 3. verify signup otp:
const verifySignupOTP = async (payload: IVerifySignupOtpType) => {
  const { email, otp } = payload;

  //  1. check is email exits with this email:
  const user = await User.isUserExistByEmail(email);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, `User doesn't exists!`);
  }

  // 2. check the status:
  if (user.status === AuthStatus.BLOCKED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Your account has been blocked. Please contact support.",
    );
  }

  if (user.status === AuthStatus.DELETED) {
    throw new AppError(
      httpStatus.GONE,
      "This account was deleted. Please contact support to restore it.",
    );
  }

  // 3. Is already otp verified :
  if (user.isOtpVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, `You account already verified!`);
  }

  // 4. Find valid otp:
  const validOtp = await Otp.verifyAndConsumeOtp(
    user?._id?.toString(),
    otpTypes.SIGNUP,
    otp,
  );

  if (!validOtp) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid otp!");
  }

  user.isOtpVerified = true;
  user.status = AuthStatus.ACTIVE;
  await user.save();
};

// 4. Login :
const login = async (payload: ILoginType) => {
  const { email, password } = payload;

  // 1. check user
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User doesn't exists!");
  }

  // 2. check user status:
  if (user.status === AuthStatus.BLOCKED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You account is blocked. Please contact support!",
    );
  }

  if (user.status === AuthStatus.DELETED) {
    throw new AppError(httpStatus.GONE, "Your account is deleted!");
  }

  // 3. check is in review or not ? if documents required

  // 4. check is otp verified ?
  if (!user.isOtpVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, "Your account is not verified!");
  }

  // 5. compare given password:
  if (!user.password) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This account was registered using social login. Please log in with Google/Apple, or use 'Forgot Password' to set your password.",
    );
  }
  const isPasswordMatched = await comparePassword(password, user.password);

  if (!isPasswordMatched) {
    throw new AppError(httpStatus.BAD_REQUEST, "Credential not matched!");
  }

  // 6. Prepare jwt payload:
  const jwtPayload: IJwtUserPayload = {
    _id: user._id?.toString(),
    email: user?.email,
    name: user?.name,
    profileImage: user?.profileImage as string,
    status: user?.status,
  };

  // 7. Generate access token :
  const accessToken = createToken(
    jwtPayload,
    configs.jwt.accessToken.secret,
    configs.jwt.accessToken.expiresIn,
  );

  // 8. Generate refresh token
  const refreshToken = createToken(
    jwtPayload,
    configs.jwt.refreshToken.secret,
    configs.jwt.refreshToken.expiresIn,
  );

  return {
    refreshToken,
    accessToken,
    email: user.email,
    isTwofactorEnabled: user.isTwoFactorEnabled,
  };
};

// 5. Forgot password
const forgotPassword = async (payload: IForgotPasswordType) => {
  const { email } = payload;
  // 1. check user
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User doesn't exists!");
  }

  // 2. check user status:
  if (user.status === AuthStatus.BLOCKED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You account is blocked. Please contact support!",
    );
  }

  if (user.status === AuthStatus.DELETED) {
    throw new AppError(httpStatus.GONE, "Your account is deleted!");
  }

  // 3. check is otp verified ?
  if (!user.isOtpVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, "Your account is not verified!");
  }

  // 4. Has valid otp for reset password :
  const exitingOtp = await Otp.findValidOtp(
    user._id.toString(),
    otpTypes.RESET,
  );
  if (exitingOtp) {
    throw new AppError(
      httpStatus.TOO_MANY_REQUESTS,
      "Please wait before requesting another OTP",
    );
  } else {
    // 8. Generate new otp
    const newOtp = generateOtp({
      length: configs.otpSettings.digits,
    });

    // 9. Store reset password otp:
    const otp = await Otp.findOneAndUpdate(
      {
        user: user?._id?.toString(),
        type: otpTypes.RESET,
      },
      {
        user: user?._id?.toString(),
        type: otpTypes.RESET,
        expiresAt: addTime(configs.otpSettings.expiresIn, "minutes"),
        otp: newOtp,
      },
      {
        new: true,
        upsert: true,
      },
    );

    // 6. Render Reset password otp template:
    const htmlTemplate = await renderEmail(
      ResetPasswordOTPEmail({
        userFirstName: user.name,
        companyName: configs.site.name,
        companyLogo: configs.site.logo as string,
        otpCode: otp?.otp as string,
      }),
    );

    // 7. Send OTP with rendered template
    await sendEmail({
      to: user.email,
      html: htmlTemplate.html,
      subject: "OTP for reset password!",
    });
  }
};

// 6. Verify Reset password otp:
const verifyResetPasswordOtp = async (payload: IVerifyResetPasswordOtpType) => {
  const { email, otp } = payload;

  // 1. check user
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User doesn't exists!");
  }

  // 2. check user status:
  if (user.status === AuthStatus.BLOCKED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You account is blocked. Please contact support!",
    );
  }

  if (user.status === AuthStatus.DELETED) {
    throw new AppError(httpStatus.GONE, "Your account is deleted!");
  }

  // 3. check is otp verified ?
  if (!user.isOtpVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, "Your account is not verified!");
  }

  // 4. Find valid otp:
  const validOtp = await Otp.verifyAndConsumeOtp(
    user?._id?.toString(),
    otpTypes.RESET,
    otp,
  );

  if (!validOtp) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid otp!");
  }

  // 5. Reset token payload:
  const resetTokenPayload = {
    _id: user?._id?.toString(),
    email: user.email,
    name: user.name,
    profileImage: user.profileImage as string,
    status: user.status,
  };

  // 5. Reset password token:
  const resetToken = createToken(
    resetTokenPayload,
    configs.jwt.resetToken.secret,
    configs.jwt.resetToken.expiresIn,
  );

  return {
    resetToken,
  };
};

// 7. Resend Signup otp:
const resendOTP = async (payload: IResendSignupType) => {
  const { email } = payload;

  // 1. Check existing user
  const user = (await User.isUserExistByEmail(email)) as IUser;
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, `User Doesn't exits!`);
  }

  if (user.status === AuthStatus.BLOCKED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Your account has been blocked. Please contact support.",
    );
  }

  if (user.status === AuthStatus.DELETED) {
    throw new AppError(
      httpStatus.GONE,
      "This account was deleted. Please contact support to restore it.",
    );
  }

  if (!user.isOtpVerified) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Your account is not verified yet!",
    );
  }

  // 2. Check Otp exists ? :
  const existingOtp = await Otp.findValidOtp(
    user._id?.toString(),
    otpTypes.RESET,
  );

  // 3. If existing otp still valid resend otp:
  if (existingOtp) {
    // Render Signup Template:
    const htmlTemplate = await renderEmail(
      ResetPasswordOTPEmail({
        userFirstName: user.name,
        companyName: configs.site.name,
        companyLogo: configs.site.logo as string,
        otpCode: existingOtp?.otp as string,
      }),
    );

    //  Send OTP with rendered template
    await sendEmail({
      to: user.email,
      html: htmlTemplate.html,
      subject: "OTP for reset password!",
    });

    throw new AppError(
      httpStatus.BAD_REQUEST,
      "An OTP has already been sent and is still valid. Please check your email or wait for it to expire.",
    );
  }

  // 4. Generate new otp:
  const newOtp = generateOtp({ length: 6 });

  // 5. Create OTP:
  const savedOtp = await Otp.findOneAndUpdate(
    {
      user: user._id.toString(),
      type: otpTypes.RESET,
    },
    {
      user: user._id.toString(),
      type: otpTypes.RESET,
      otp: newOtp,
      expiresAt: addTime(configs.otpSettings.expiresIn, "minutes", true),
    },
    {
      new: true,
    },
  );

  // 6. Render Signup Template:
  const htmlTemplate = await renderEmail(
    ResetPasswordOTPEmail({
      userFirstName: user.name,
      companyName: configs.site.name,
      companyLogo: configs.site.logo as string,
      otpCode: savedOtp?.otp as string,
    }),
  );

  // 7. Send OTP with rendered template
  await sendEmail({
    to: user.email,
    html: htmlTemplate.html,
    subject: "OTP for reset password!",
  });

  return {
    geneated: true,
  };
};

// 8. Reset password :
const resetPassword = async (
  resetToken: string,
  payload: IResetPasswordOtpType,
) => {
  const { newPassword } = payload;

  // 1. Decode the reset token:
  const decoded = verifyToken(resetToken, configs.jwt.resetToken.secret);
  if (!decoded.email) {
    throw new AppError(httpStatus.FORBIDDEN, "Invalid Token!");
  }

  // 2. Find user with this email:
  const user = await User.findOne({ email: decoded.email }).select("+password");
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User doesn't exits!");
  }

  // 3. Check user status :
  if (await User.isUserBlocked(user)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You account is blocked. Please contact support!",
    );
  }

  if (await User.isUserDeleted(user)) {
    throw new AppError(httpStatus.GONE, "Your account is deleted!");
  }

  // 4. Compare if JWT was issued before password change:
  if (
    await User.isJwtIssuedBeforePasswordChanged(
      user.passwordChangedAt as Date,
      decoded.iat as number,
    )
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, "Your session has expired.");
  }

  // 4. Hash password:
  const hashedPassword = await hashPassword(
    newPassword,
    configs.passwordSoltRound,
  );

  // 5. Update user password:
  await User.findOneAndUpdate(
    {
      _id: user?._id,
    },
    {
      $set: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
    },
  );

  return;
};

// 9. Changed password:
const changedPassword = async (
  userInfo: IUser,
  payload: IChangedPasswordType,
) => {
  const { newPassword, oldPassword } = payload;

  // 1. Check is user exists with this id?:
  const user = await User.findById(userInfo._id).select("+password");
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User doesn't exists!");
  }

  // 2. Compare old password to password hash:
  if (!user.password) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This account does not have a password set yet. Please use 'Forgot Password' to create a password.",
    );
  }
  const isPasswordMatched = await comparePassword(oldPassword, user.password);
  if (!isPasswordMatched) {
    throw new AppError(httpStatus.CONFLICT, "Password not matched!");
  }

  // 3. Hash new password:
  const hashedPassword = await hashPassword(
    newPassword,
    configs.passwordSoltRound,
  );

  // 4. Update password now:
  await User.findOneAndUpdate(
    {
      _id: user._id,
    },
    {
      password: hashedPassword,
      passwordChangedAt: new Date(),
    },
    {
      new: true,
    },
  );
};

// 10. Get me:
const getMe = async (user: IUser) => {
  // check is the user exists?:

  console.log(user);

  const me = await User.aggregate([
    {
      $match: {
        _id: new Types.ObjectId(user._id),
      },
    },
    {
      $lookup: {
        from: "userprofiles",
        localField: "_id",
        foreignField: "user",
        as: "profile",
        pipeline: [
          {
            $lookup: {
              from: "dutystations",
              localField: "currentStation",
              foreignField: "_id",
              as: "currentStationDetails",
            },
          },
          {
            $lookup: {
              from: "dutystations",
              localField: "futureStation",
              foreignField: "_id",
              as: "futureStationDetails",
            },
          },
          {
            $lookup: {
              from: "branches",
              localField: "branch",
              foreignField: "_id",
              as: "branchDetails",
            },
          },
          {
            $unwind: {
              path: "$futureStationDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$currentStationDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$branchDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
      },
    },

    {
      $unwind: {
        path: "$profile",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        status: 1,
        role: 1,
        isTwoFactorEnabled: 1,
        twoFactorBackupCodes: 1,
        profileImage: 1,
        isOtpVerified: 1,
        createdAt: 1,
        updatedAt: 1,
        passwordChangedAt: 1,
        branch: "$profile.branchDetails",
        affiliation: "$profile.affiliation",
        interestTags: "$profile.interestTags",
        kidsAgeRanges: "$profile.kidsAgeRanges",
        estimatedPcsDate: "$profile.estimatedPcsDate",
        futureStation: "$profile.futureStationDetails",
        currentStation: "$profile.currentStationDetails",
      },
    },
  ]);

  console.log(me);

  return me[0];
};

/**
 * 11. Update user profile and handle side effects like group archiving
 */
const updateProfile = async (
  userId: string,
  payload: any,
  profileImage?: Express.Multer.File,
) => {
  const {
    name,
    branch,
    currentStation,
    futureStation,
    estimatedPcsDate,
    interestTags,
    kidsAgeRanges,
    affiliation,
  } = payload;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // 1. Validate if the provided IDs exist in the database
    if (branch) {
      const branchExists = await Branch.findById(branch);
      if (!branchExists)
        throw new AppError(
          httpStatus.BAD_REQUEST,
          "Selected Branch not found!",
        );
    }

    if (currentStation) {
      const currentExists = await DutyStation.findById(currentStation);
      if (!currentExists)
        throw new AppError(
          httpStatus.NOT_FOUND,
          "Current duty station not found!",
        );
    }

    if (futureStation) {
      const futureExists = await DutyStation.findById(futureStation);
      if (!futureExists)
        throw new AppError(
          httpStatus.NOT_FOUND,
          "Future duty station not found!",
        );
    }

    // 2. Handle Profile Image Upload (S3)
    let imageUrl;
    if (profileImage) {
      const uploaded = await uploadSingleFileToS3(profileImage, "profiles");
      imageUrl = uploaded.url;
    }

    // 3. Update the core User collection (Name & Profile Image)
    const userUpdateData: any = {};
    if (name) userUpdateData.name = name;
    if (imageUrl) userUpdateData.profileImage = imageUrl;

    if (Object.keys(userUpdateData).length > 0) {
      await User.findByIdAndUpdate(userId, userUpdateData, { session });
    }

    // 4. Group Transition Logic: Fetch old profile or create initial profile if new user
    let oldProfile = await UserProfile.findOne({ user: userId }).session(
      session,
    );
    if (!oldProfile) {
      if (!branch || !affiliation || !currentStation) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          "Branch, affiliation, and current station are required to setup profile!",
        );
      }
      const createdProfiles = await UserProfile.create(
        [
          {
            user: userId,
            branch,
            affiliation,
            currentStation,
            interestTags: interestTags || [],
            kidsAgeRanges: kidsAgeRanges || [],
            ...(futureStation && { futureStation }),
            ...(estimatedPcsDate && { estimatedPcsDate }),
          },
        ],
        { session },
      );
      const newProfile = createdProfiles[0];
      if (!newProfile) {
        throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to create profile");
      }
      oldProfile = newProfile;
      await User.findByIdAndUpdate(userId, { status: AuthStatus.ACTIVE }, { session });
    }

    if (!oldProfile) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        "User profile record not found!",
      );
    }

    // Check if the user has changed their Future Station or their PCS Date
    const isFutureStationChanged =
      futureStation &&
      oldProfile.futureStation?.toString() !== futureStation.toString();
    const isPcsDateChanged =
      estimatedPcsDate && oldProfile.estimatedPcsDate !== estimatedPcsDate;

    if (isFutureStationChanged || isPcsDateChanged) {
      /**
       * If plans changed, archive previous active memberships.
       * This ensures the user doesn't stay in a group for a base or date they are no longer going to.
       */
      await GroupMember.updateMany(
        {
          user: userId,
          status: MembershipStatus.ACTIVE,
        },
        {
          $set: {
            status: MembershipStatus.ARCHIVED,
            archivedAt: new Date(),
          },
        },
        { session },
      );
    }

    // 5. Update the UserProfile collection
    const profileUpdateData = {
      ...(branch && { branch }),
      ...(affiliation && { affiliation }),
      ...(interestTags && { interestTags }),
      ...(kidsAgeRanges && { kidsAgeRanges }),
      ...(currentStation && { currentStation }),
      ...(futureStation && { futureStation }),
      ...(isFutureStationChanged && { isArrived: false }),
      ...(estimatedPcsDate && { estimatedPcsDate }),
    };

    const updatedProfile = await UserProfile.findOneAndUpdate(
      { user: userId },
      { $set: profileUpdateData },
      { new: true, session },
    );

    // 6. Generate New Group Suggestion
    // If the user has a valid future station and date, find the new matching cohort group
    let suggestedGroup = null;
    if (updatedProfile?.futureStation && updatedProfile?.estimatedPcsDate) {
      suggestedGroup = await groupServices.findOrCreateSuggestedGroup({
        userId: userId,
        futureStationId: updatedProfile.futureStation.toString(),
        pcsDate: updatedProfile.estimatedPcsDate,
      });
    }

    // Commit all changes
    await session.commitTransaction();
    session.endSession();

    return {
      profile: updatedProfile,

      suggestedGroupId: suggestedGroup?._id || null,
    };
  } catch (error: any) {
    // Rollback changes if any error occurs
    await session.abortTransaction();
    session.endSession();
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Failed to update profile",
    );
  }
};

const updateProfileAdmin = async (
  userId: string,
  payload: any,
  profileImage?: Express.Multer.File,
) => {
  const { name } = payload;

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  try {
    // 2. Handle Profile Image Upload (S3)
    let imageUrl;
    if (profileImage) {
      const uploaded = await uploadSingleFileToS3(profileImage, "profiles");
      imageUrl = uploaded.url;
    }

    // 3. Update the core User collection (Name & Profile Image)
    if (name) user.name = name;
    if (imageUrl) user.profileImage = imageUrl;

    await user.save();

    return {
      message: `update successfully`,
    };
  } catch (error: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Failed to update profile",
    );
  }
};

const refreshToken = async (refreshToken: string) => {
  if (!refreshToken) {
    throw new AppError(httpStatus.BAD_REQUEST, "Refresh token is required!");
  }

  // 1. check is refresh token valid : ?
  const decoded = await verifyToken(
    refreshToken,
    configs.jwt.refreshToken.secret,
  );

  if (!decoded?.email) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid access token");
  }

  /**
   * 2. Fetch user
   */
  const user = await User.isUserExistByEmail(decoded.email);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  /**
   * 3. Account status checks
   */
  if (await User.isUserBlocked(user)) {
    throw new AppError(httpStatus.FORBIDDEN, "Your account has been blocked");
  }

  if (await User.isUserDeleted(user)) {
    throw new AppError(httpStatus.GONE, "Your account has been deleted");
  }

  if (!user.isOtpVerified) {
    throw new AppError(httpStatus.FORBIDDEN, "Please verify your account");
  }

  if (await User.isUserUnderReview(user)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Your account is under review. Please submit required documents",
    );
  }

  if (user.status !== AuthStatus.ACTIVE) {
    throw new AppError(httpStatus.FORBIDDEN, "Your account is not active");
  }

  /**
   * 4. Token invalidation check
   */
  if (
    user.passwordChangedAt &&
    (await User.isJwtIssuedBeforePasswordChanged(
      user.passwordChangedAt,
      decoded.iat as number,
    ))
  ) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Token has expired. Please log in again",
    );
  }

  const jwtPayload: IJwtUserPayload = {
    _id: user._id?.toString(),
    email: user?.email,
    name: user?.name,
    profileImage: user?.profileImage as string,
    status: user?.status,
  };

  // 5. Generate new access token :
  const accessToken = createToken(
    jwtPayload,
    configs.jwt.accessToken.secret,
    configs.jwt.accessToken.expiresIn,
  );

  return { accessToken };
};

const googleClient = new OAuth2Client();

export interface IVerifiedGoogleUser {
  googleId: string;
  email: string;
  name?: string | undefined;
  picture?: string | undefined;
  isEmailVerified: boolean;
}

export interface IVerifiedAppleUser {
  appleId: string;
  email?: string | undefined;
  isEmailVerified: boolean;
}

/**
 * 13. Verify Google ID Token (Google Cloud Console OAuth 2.0)
 * Uses google-auth-library with fallback to Google tokeninfo API.
 */
export const verifyGoogleIdToken = async (
  idToken: string,
): Promise<IVerifiedGoogleUser> => {
  if (!idToken || typeof idToken !== "string") {
    throw new AppError(httpStatus.BAD_REQUEST, "Google ID token is required");
  }

  const audienceList: string[] = [
    configs.google.webClientId,
    configs.google.iosClientId,
    configs.google.androidClientId,
    ...(configs.google.clientId ? configs.google.clientId.split(",") : []),
  ]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s));

  const configuredAudience: string | string[] | undefined =
    audienceList.length === 0
      ? undefined
      : audienceList.length === 1
        ? audienceList[0]
        : audienceList;

  let lastError: Error | null = null;

  // Primary method: verify using google-auth-library
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      ...(configuredAudience ? { audience: configuredAudience } : {}),
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new AppError(httpStatus.UNAUTHORIZED, "Invalid Google token payload");
    }

    if (!payload.email) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Google account does not have an email address associated with it",
      );
    }

    const name =
      payload.name ||
      `${payload.given_name || ""} ${payload.family_name || ""}`.trim() ||
      payload.email.split("@")[0];

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase().trim(),
      ...(name ? { name } : {}),
      ...(payload.picture ? { picture: payload.picture } : {}),
      isEmailVerified: payload.email_verified ?? true,
    };
  } catch (error: any) {
    lastError = error;
  }

  // Fallback method: Verify using Google OAuth2 tokeninfo endpoint
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(
        idToken,
      )}`,
    );

    if (response.ok) {
      const data: any = await response.json();

      if (data && data.sub && data.email) {
        if (audienceList.length > 0 && !audienceList.includes(data.aud)) {
          throw new AppError(
            httpStatus.UNAUTHORIZED,
            `Google token audience mismatch. Received '${data.aud}' but expected one of: ${audienceList.join(", ")}`,
          );
        }

        const name =
          data.name ||
          `${data.given_name || ""} ${data.family_name || ""}`.trim() ||
          data.email.split("@")[0];

        return {
          googleId: data.sub,
          email: data.email.toLowerCase().trim(),
          ...(name ? { name } : {}),
          ...(data.picture ? { picture: data.picture } : {}),
          isEmailVerified: data.email_verified === "true" || data.email_verified === true,
        };
      }
    }
  } catch (fallbackError: any) {
    if (fallbackError instanceof AppError) throw fallbackError;
  }

  throw new AppError(
    httpStatus.UNAUTHORIZED,
    `Google token verification failed: ${lastError?.message || "Invalid or expired token"}`,
  );
};

/**
 * 14. Verify Apple Identity Token (Sign in with Apple)
 * Verifies token signature with Apple's JWKS public keys.
 */
export const verifyAppleIdToken = async (
  identityToken: string,
): Promise<IVerifiedAppleUser> => {
  if (!identityToken || typeof identityToken !== "string") {
    throw new AppError(httpStatus.BAD_REQUEST, "Apple identity token is required");
  }

  const configuredAudience = configs.apple.clientId || undefined;

  try {
    const payload = await appleSignin.verifyIdToken(identityToken, {
      ...(configuredAudience ? { audience: configuredAudience } : {}),
      ignoreExpiration: false,
    });

    if (!payload || !payload.sub) {
      throw new AppError(httpStatus.UNAUTHORIZED, "Invalid Apple token payload");
    }

    return {
      appleId: payload.sub,
      ...(payload.email ? { email: payload.email.toLowerCase().trim() } : {}),
      isEmailVerified:
        payload.email_verified === "true" || payload.email_verified === true,
    };
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      `Apple token verification failed: ${error.message || "Invalid or expired token"}`,
    );
  }
};

export const verifyGoogleToken = verifyGoogleIdToken;
export const verifyAppleToken = verifyAppleIdToken;

/**
 * 15. Core OAuth Handler (Google & Apple)
 */
const handleOAuthLogin = async ({
  provider,
  email,
  name,
  profileImage,
}: {
  provider: "google" | "apple";
  email: string;
  name?: string | undefined;
  profileImage?: string | undefined;
}) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check if user already exists
  let user = await User.findOne({ email: normalizedEmail }).select("+password");
  let isNewUser = false;

  if (user) {
    // 2. Status checks
    if (user.status === AuthStatus.BLOCKED) {
      throw new AppError(httpStatus.FORBIDDEN, "Your account is blocked. Please contact support!");
    }

    if (user.status === AuthStatus.DELETED) {
      throw new AppError(httpStatus.GONE, "Your account is deleted!");
    }

    // Auto-verify OTP for OAuth verified accounts
    let shouldSave = false;
    if (!user.isOtpVerified) {
      user.isOtpVerified = true;
      shouldSave = true;
    }
    if (!user.profileImage && profileImage) {
      user.profileImage = profileImage;
      shouldSave = true;
    }
    if (!user.name && name) {
      user.name = name;
      shouldSave = true;
    }
    if (shouldSave) {
      await user.save();
    }
  } else {
    // 3. New user: Account does not exist previously -> User must setup profile first
    isNewUser = true;

    const emailPrefix = normalizedEmail.split("@")[0] ?? "User";
    const userName = name || emailPrefix;

    user = await User.create({
      name: userName,
      email: normalizedEmail,
      status: AuthStatus.PENDING, // PENDING until user completes profile setup
      role: AuthRoles.USER,
      authProvider: provider,
      isOtpVerified: true,
      ...(profileImage ? { profileImage } : {}),
    });
  }

  // 4. Check if user has an existing UserProfile
  const existingProfile = await UserProfile.findOne({ user: user._id });
  const isProfileCompleted = !!existingProfile;

  // 5. Generate access and refresh tokens
  const jwtPayload: IJwtUserPayload = {
    _id: user._id.toString(),
    email: user.email,
    name: user.name,
    profileImage: user.profileImage as string,
    status: user.status,
  };

  const accessToken = createToken(
    jwtPayload,
    configs.jwt.accessToken.secret,
    configs.jwt.accessToken.expiresIn,
  );

  const refreshToken = createToken(
    jwtPayload,
    configs.jwt.refreshToken.secret,
    configs.jwt.refreshToken.expiresIn,
  );

  return {
    accessToken,
    refreshToken,
    email: user.email,
    isTwofactorEnabled: user.isTwoFactorEnabled,
    isNewUser,
    isProfileCompleted,
    needsProfileSetup: !isProfileCompleted,
    ...(isNewUser && { message: "Account created. Please complete your profile setup." }),
  };
};

/**
 * 16. Google Login
 */
const googleLogin = async (payload: IGoogleLoginType) => {
  const { idToken } = payload;
  const verified = await verifyGoogleIdToken(idToken);
  return handleOAuthLogin({
    provider: "google",
    email: verified.email,
    ...(verified.name ? { name: verified.name } : {}),
    ...(verified.picture ? { profileImage: verified.picture } : {}),
  });
};

/**
 * 17. Apple Login
 */
const appleLogin = async (payload: IAppleLoginType) => {
  const { idToken } = payload;
  const verified = await verifyAppleIdToken(idToken);
  const email = verified.email || `${verified.appleId}@privaterelay.appleid.com`;
  return handleOAuthLogin({
    provider: "apple",
    email,
    name: email.split("@")[0],
  });
};

/**
 * 18. Unified OAuth Login
 */
const oauthLogin = async (payload: IOAuthLoginType) => {
  if (payload.provider === "google") {
    return googleLogin({
      idToken: payload.idToken,
    });
  } else if (payload.provider === "apple") {
    return appleLogin({
      idToken: payload.idToken,
    });
  }
  throw new AppError(httpStatus.BAD_REQUEST, "Unsupported OAuth provider");
};

export const AuthServices = {
  signUp,
  resendSignupOTP,
  verifySignupOTP,
  login,
  googleLogin,
  appleLogin,
  oauthLogin,
  verifyGoogleIdToken,
  verifyAppleIdToken,
  verifyGoogleToken,
  verifyAppleToken,
  forgotPassword,
  verifyResetPasswordOtp,
  resendOTP,
  resetPassword,
  changedPassword,
  getMe,
  updateProfile,
  refreshToken,
  updateProfileAdmin,
};
