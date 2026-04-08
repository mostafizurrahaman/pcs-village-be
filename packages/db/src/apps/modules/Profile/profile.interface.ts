import type { Document, Types } from 'mongoose'
import type { TAffiliation, TKidsAgeRange } from './profile.constant'

export interface IUserProfile {
  user: Types.ObjectId
  branch: Types.ObjectId
  affiliation: TAffiliation
  interestTags: string[]
  kidsAgeRanges: TKidsAgeRange[]
  currentStation: Types.ObjectId
  futureStation: Types.ObjectId
  estimatedPcsDate: string
  isArrived: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IUserProfileDocument extends IUserProfile, Document {}
