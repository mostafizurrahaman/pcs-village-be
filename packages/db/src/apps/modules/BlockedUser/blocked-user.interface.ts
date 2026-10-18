import type { Document, Types } from 'mongoose'

export interface IBlockedUser {
  blocker: Types.ObjectId
  blocked: Types.ObjectId
  reason?: string | undefined
  createdAt: Date
  updatedAt: Date
}

export interface IBlockedUserDoc extends IBlockedUser, Document {}
