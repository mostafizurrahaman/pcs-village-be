import { model, Schema } from 'mongoose'
import type { ICommunityComment } from './community-comments.interface'

const CommunityCommentSchema = new Schema<ICommunityComment>(
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

export const CommunityComment = model<ICommunityComment>('CommunityComment', CommunityCommentSchema)
