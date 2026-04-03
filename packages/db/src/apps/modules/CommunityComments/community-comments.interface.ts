import type { Types } from 'mongoose'

export interface ICommunityComment {
  author: Types.ObjectId
  post: Types.ObjectId
  parent: Types.ObjectId
  attachments: string[]
  content: string
  createdAt: Date
  updatedAt: Date
}
