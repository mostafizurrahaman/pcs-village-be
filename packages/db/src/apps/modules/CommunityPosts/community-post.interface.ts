import type { Types } from 'mongoose'

export interface ICommunityPost {
  author: Types.ObjectId
  station: Types.ObjectId
  attachments: string[]
  content: string
  isHidden: Boolean
  createdAt: Date
  updatedAt: Date
}
