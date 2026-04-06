import { model, Schema } from 'mongoose'
import type { IContentDocument } from './content.interface'

export const contentSchema = new Schema<IContentDocument>(
  {
    termsAndCondition: {
      type: String,
      default: '',
    },
    aboutUs: {
      type: String,
      default: '',
    },
    privacyPolicy: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
)

export const Content = model<IContentDocument>('Content', contentSchema)
