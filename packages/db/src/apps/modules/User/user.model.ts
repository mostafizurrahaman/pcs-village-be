import { model, Schema } from 'mongoose'

import { AuthRoles, AuthStatus } from './user.constant'
import type { IUser, IUserModel } from './user.interface'

const userSchema = new Schema<IUser, IUserModel>(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    status: {
      type: String,
      enum: AuthStatus,
      default: AuthStatus.PENDING,
    },

    //  Auth Provider :
    authProvider: {
      type: String,
      enum: ['google', 'email', 'apple'],
    },

    // roles:
    role: {
      type: String,
      enum: AuthRoles,
      default: AuthRoles.USER,
    },

    //  profile image:
    profileImage: {
      type: String,
    },

    twoFactorSecret: {
      type: String,
      select: false,
    },
    isTwoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorBackupCodes: {
      type: [String],
      select: false,
    },

    // otp verified:
    isOtpVerified: {
      type: Boolean,
      default: false,
    },

    // reason fields:
    blockedReason: {
      type: String,
    },
    deletionReason: {
      type: String,
    },

    // blocked at:
    blockedAt: {
      type: Date,
    },
    deletedAt: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// 1. Find user with _id: (Object id)
userSchema.statics.getUserById = async function (id: string): Promise<IUser | null> {
  return this.findById(id)
}

// 2. Find User with email address:
userSchema.statics.isUserExistByEmail = async function (email: string): Promise<IUser | null> {
  return this.findOne({
    email,
  })
}

// 3. Check is user active by id:
userSchema.statics.isUserActive = async function (user: IUser) {
  return user.status === AuthStatus.ACTIVE
}

// 4. Check is user deleted by id:
userSchema.statics.isUserDeleted = async function (user: IUser) {
  return user.status === AuthStatus.DELETED
}

// 5. Check is user blocked by id:
userSchema.statics.isUserBlocked = async function (user: IUser) {
  return user.status === AuthStatus.BLOCKED
}

// 6. check is user under_review by id:
userSchema.statics.isUserUnderReview = async function (user: IUser) {
  return user.status === AuthStatus.IN_REVIEW
}

// 7. check is user in Pending  by id:
userSchema.statics.isUserStatusPending = async function (user: IUser) {
  return user.status === AuthStatus.PENDING
}

// 8. remove hash password :
userSchema.post('save', async function (doc, next) {
  doc.password = ''
  next()
})

// 9. Compare is jwt issued before password changed ?
userSchema.statics.isJwtIssuedBeforePasswordChanged = function (
  passwordChangedAt: Date,
  jwtIssuedTimestamp: number
): boolean {
  if (!passwordChangedAt) {
    return false
  }

  // Convert to milliseconds
  const jwtIssuedTime = jwtIssuedTimestamp * 1000

  // Compare
  return jwtIssuedTime < passwordChangedAt.getTime()
}

export const User = model<IUser, IUserModel>('User', userSchema)
