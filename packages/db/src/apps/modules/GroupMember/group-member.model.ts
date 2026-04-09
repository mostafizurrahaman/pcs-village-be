import { model, Schema } from 'mongoose'
import type { IGroupMemberDoc } from './group-member.interface'
import { MembershipStatus, membershipValues } from './group-member.constant'

const GroupMemberSchema = new Schema<IGroupMemberDoc>(
  {
    group: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: membershipValues,
      default: MembershipStatus.ACTIVE,
    },
    archivedAt: {
      type: Date,
    },
    joinedAt: {
      type: Date,
      default: Date.now(),
      required: true,
    },
    leavedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export const GroupMember = model<IGroupMemberDoc>('GroupMember', GroupMemberSchema)
