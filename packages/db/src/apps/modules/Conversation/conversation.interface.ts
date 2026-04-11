import type { Document, Types } from 'mongoose'

export interface IConversation {
  participant: Types.ObjectId[]
  initiator: Types.ObjectId
  lastMessage?: Types.ObjectId
  isActive: boolean
}

export interface IConversationDoc extends IConversation, Document {}
