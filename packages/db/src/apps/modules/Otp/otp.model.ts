import { model, Schema } from 'mongoose'
import type { IOtp, IOtpDocument, IOtpModel, IOtpType } from './otp.interface'
import { otpTypeValues } from './otp.constant'

const otpSchema = new Schema<IOtp, IOtpModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      enum: otpTypeValues,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// 2. Find Valid otp for user
otpSchema.statics.findValidOtp = function (
  user: string,
  type: IOtpType
): Promise<IOtpDocument | null> {
  return this.findOne({
    user,
    type,
    expiresAt: { $gt: new Date() },
  })
}

//  3. verifyAndConsumeOtp:
otpSchema.statics.verifyAndConsumeOtp = function (
  user: string,
  type: IOtpType,
  otp: string
): Promise<IOtpDocument | null> {
  return this.findOneAndDelete({
    user,
    type,
    otp,
    expiresAt: { $gt: new Date() },
  })
}

otpSchema.index({ user: 1, type: 1 }, { unique: true })

// otp model:
export const Otp = model<IOtp, IOtpModel>('Otp', otpSchema)
