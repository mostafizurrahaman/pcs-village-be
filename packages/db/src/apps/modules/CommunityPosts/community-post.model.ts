import { model, Schema } from 'mongoose'
import type { ICommunityPost } from './community-post.interface'

const CommunityPostSchema = new Schema<ICommunityPost>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      requried: true,
    },
    station: {
      type: Schema.Types.ObjectId,
      ref: 'DutyStation',
      requried: true,
    },
    content: {
      type: String,
    },
    attachments: {
      type: [String],
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export const CommunityPost = model<ICommunityPost>('CommunityPost', CommunityPostSchema)
