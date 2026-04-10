import type { Document, Types } from 'mongoose'

export interface IGroupPostComment {
  author: Types.ObjectId
  post: Types.ObjectId
  parent?: Types.ObjectId
  content: string
  attachments?: string[]
  createdAt: Date
  updatedAt: Date
}

export interface IGroupPostCommentDoc extends IGroupPostComment, Document {}
