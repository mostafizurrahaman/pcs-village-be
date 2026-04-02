import { Document, Types } from 'mongoose'
import type { DutyStationType } from './duty-station.constant'

export interface IDutyStation extends Document {
  name: string
  country: string
  state: string
  city: string
  type: DutyStationType
  isApproved: boolean
  suggestedBy: Types.ObjectId | string
  createdAt: Date
  updatedAt: Date
}
