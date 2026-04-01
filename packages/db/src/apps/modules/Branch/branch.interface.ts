import { Document } from 'mongoose'

export interface IBranch extends Document {
  name: string
  slug: string
  createdAt: Date
  updatedAt: Date
}
