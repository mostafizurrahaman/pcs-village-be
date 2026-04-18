import { model, Schema, Types } from 'mongoose'
import type { IReportDoc } from './reports.interface'

const reportSchema = new Schema<IReportDoc>(
  {
    post: {
      type: Types.ObjectId,
      refPath: 'postModel',
      required: true,
    },
    postModel: {
      type: String,
      required: true,
      enum: ['GroupPost', 'CommunityPost'],
    },
    reporter: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isGroup: {
      type: Boolean,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export const Report = model<IReportDoc>('Report', reportSchema)
