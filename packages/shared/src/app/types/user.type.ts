import type { Types } from 'mongoose'

export interface IUser {
  _id: Types.ObjectId
  name: string
  email: string
  password: string
  status: string

  // roles:
  role: string

  // profile common properties:
  profileImage?: string

  // 2FA:
  twoFactorSecret?: string
  isTwoFactorEnabled: boolean
  twoFactorBackupCodes?: string[]
  isOtpVerified: boolean

  // reason:
  blockedReason?: string
  deletionReason?: string

  // common timestamps:
  blockedAt?: Date
  deletedAt?: Date
  passwordChangedAt?: Date
  createdAt: Date
  updatedAt: Date
}
