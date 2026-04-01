import { model, Schema } from 'mongoose'
import type { IBranch } from './branch.interface'
import { slugify } from '@repo/shared'

const branchSchema = new Schema<IBranch>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

branchSchema.pre('save', async function () {
  this.slug = slugify(this.name)
})

export const Branch = model<IBranch>('Branch', branchSchema)
