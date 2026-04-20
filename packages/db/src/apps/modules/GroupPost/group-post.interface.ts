import type { Document, Types } from 'mongoose'

export interface IGroupPost {
  group: Types.ObjectId
  author: Types.ObjectId
  content: string
  attachments?: string[]
  isHidden: Boolean
  createdAt: Date
  updatedAt: Date
}

export interface IGroupPostDoc extends IGroupPost, Document {}
