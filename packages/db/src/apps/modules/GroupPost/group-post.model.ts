import { model, Schema } from 'mongoose'
import type { IGroupPostDoc } from './group-post.interface'

const groupPostSchema = new Schema<IGroupPostDoc>(
  {
    group: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    attachments: {
      type: [String],
      default: [],
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

export const GroupPost = model<IGroupPostDoc>('GroupPost', groupPostSchema)
