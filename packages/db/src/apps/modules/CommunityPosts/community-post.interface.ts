import type { Types } from 'mongoose'

export interface ICommunityPost {
  author: Types.ObjectId
  station: Types.ObjectId
  post: Types.ObjectId
  parent: Types.ObjectId
  attachments: string[]
  content: string
  createdAt: Date
  updatedAt: Date
}
