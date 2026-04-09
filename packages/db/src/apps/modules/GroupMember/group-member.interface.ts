import type { Document, Types } from 'mongoose'
import type { TMembershipStatus } from './group-member.constant'

export interface IGroupMember {
  group: Types.ObjectId
  user: Types.ObjectId
  status: TMembershipStatus
  joinedAt: Date
  archivedAt?: Date
  leavedAt?: Date
}

export interface IGroupMemberDoc extends IGroupMember, Document {}
