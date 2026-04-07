import { model, Schema } from 'mongoose'
import type { IGroupDocuments } from './group.interface'
import { groupTypeValues } from './group.constant'

const GroupSchema = new Schema<IGroupDocuments>(
  {
    station: {
      type: Schema.Types.ObjectId,
      ref: 'DutyStation',
    },
    timeline: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: groupTypeValues,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

export const Group = model<IGroupDocuments>('Group', GroupSchema)
