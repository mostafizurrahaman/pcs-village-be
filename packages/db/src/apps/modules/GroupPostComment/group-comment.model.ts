import { model, Schema } from 'mongoose'
import type { IGroupPostCommentDoc } from './group-comment.interface'

const GroupPostCommentSchema = new Schema<IGroupPostCommentDoc>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: 'GroupPost',
      required: true,
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'GroupPostComment',
      default: null,
    },
    content: {
      type: String,
      required: true,
    },
    attachments: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export const GroupPostComment = model<IGroupPostCommentDoc>(
  'GroupPostComment',
  GroupPostCommentSchema
)
