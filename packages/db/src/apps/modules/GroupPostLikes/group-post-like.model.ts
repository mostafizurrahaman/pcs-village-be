import { model, Schema } from 'mongoose'
import type { IGroupPostLike } from './group-post-like.interface'

export const GroupPostLikeSchema = new Schema<IGroupPostLike>(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'GroupPost',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export const GroupPostLike = model<IGroupPostLike>('GroupPostLike', GroupPostLikeSchema)
