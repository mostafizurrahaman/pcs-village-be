import { model, Schema } from 'mongoose'
import type { IPostLike } from './post-like.interface'

export const PostLikeSchema = new Schema<IPostLike>(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'CommunityPost',
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

export const PostLike = model<IPostLike>('PostLike', PostLikeSchema)
