import { model, Schema } from 'mongoose'
import { AffiliationValues, KidsAgeRangeValues } from './profile.constant'
import type { IUserProfileDocument } from './profile.interface'

const userProfileSchema = new Schema<IUserProfileDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    branch: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    affiliation: {
      type: String,
      enum: AffiliationValues,
      required: true,
    },
    interestTags: {
      type: [String],
      default: [],
    },
    kidsAgeRanges: {
      type: [String],
      enum: KidsAgeRangeValues,
      default: [],
    },
    currentStation: {
      type: Schema.Types.ObjectId,
      ref: 'DutyStation',
      required: true,
    },
    futureStation: {
      type: Schema.Types.ObjectId,
      ref: 'DutyStation',
    },
    estimatedPcsDate: {
      type: String,
      trim: true,
    },
    isArrived: {
      type: Date,
    },
  
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Indices for performance on common lookups
userProfileSchema.index({ user: 1 })
userProfileSchema.index({ branch: 1 })
userProfileSchema.index({ currentStation: 1 })

export const UserProfile = model<IUserProfileDocument>('UserProfile', userProfileSchema)
