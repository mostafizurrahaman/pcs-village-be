import { model, Schema } from 'mongoose'
import type { IDutyStation } from './duty-station.interface'
import { DutyStationTypeValues } from './duty-station.constant'


const dutyStationSchema = new Schema<IDutyStation>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: DutyStationTypeValues,
      required: true,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    suggestedBy: {
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

// Index for searching locations
dutyStationSchema.index({ country: 1, state: 1, city: 1 })

export const DutyStation = model<IDutyStation>('DutyStation', dutyStationSchema)
