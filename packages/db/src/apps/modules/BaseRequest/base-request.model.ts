import { model, Schema } from 'mongoose'
import type { IBaseRequestDoc } from './base-request.interface'
import { baseRequestStatus, baseRequestStatusValues } from './base-request.constant'
import { DutyStationTypeValues } from '../DutyStation/duty-station.constant'

const baseRequestSchema = new Schema<IBaseRequestDoc>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: DutyStationTypeValues,
      required: true,
    },
    status: {
      type: String,
      enum: baseRequestStatusValues,
      default: baseRequestStatus.PENDING,
    },
    adminNote: { 
      type: String,  
    },
    approvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
)

export const BaseRequest = model<IBaseRequestDoc>('BaseRequest', baseRequestSchema)
