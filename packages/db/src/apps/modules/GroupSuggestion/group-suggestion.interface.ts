import type { Document, Types } from 'mongoose'

export interface IGroupSuggestion {
  group: Types.ObjectId
  user: Types.ObjectId
  isDissmiss: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IGroupSuggestionDoc extends IGroupSuggestion, Document {}
