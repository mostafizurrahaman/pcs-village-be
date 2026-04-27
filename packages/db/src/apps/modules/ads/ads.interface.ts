import type { Document, Types } from 'mongoose'

interface IAds {
  user: Types.ObjectId
  url: string
  banner: string
}

export interface IAdsDoc extends IAds, Document {}
