import type { Types } from 'mongoose'

export interface IGroupPostLike {
  post: Types.ObjectId
  user: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}
