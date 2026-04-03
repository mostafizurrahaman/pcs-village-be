import type { Types } from 'mongoose'

export interface IPostLike {
  post: Types.ObjectId
  user: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}
