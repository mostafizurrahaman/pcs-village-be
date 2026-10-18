import { model, Schema } from 'mongoose'
import type { IBlockedUserDoc } from './blocked-user.interface'

const blockedUserSchema = new Schema<IBlockedUserDoc>(
  {
    blocker: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    blocked: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

blockedUserSchema.index({ blocker: 1, blocked: 1 }, { unique: true })

export const BlockedUser = model<IBlockedUserDoc>('BlockedUser', blockedUserSchema)
