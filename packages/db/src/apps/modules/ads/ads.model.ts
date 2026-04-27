import { model, Schema } from 'mongoose'
import type { IAdsDoc } from './ads.interface'

const adsSchema = new Schema<IAdsDoc>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    url: {
      type: String,
    },
    banner: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export const Ads = model<IAdsDoc>('Ads', adsSchema)
