import { model, Schema } from 'mongoose'
import type { ICommunityPost } from '../CommunityPosts'

const CommunityCommentSchema = new Schema<ICommunityPost>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: 'CommunityPost',
      required: true,
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'CommunityComment',
      required: true,
    },
    attachments: {
      type: [String],
    },
    content: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export const CommunityComment = model<ICommunityPost>('CommunityComment', CommunityCommentSchema)
