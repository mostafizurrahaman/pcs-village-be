import type { Types } from 'mongoose'

export interface ICommunityComments {
  author: Types.ObjectId
  post: Types.ObjectId
  parent: Types.ObjectId
  attachments: string[]
  content: string
  createdAt: Date
  updatedAt: Date
}
