import type { Document, Types } from 'mongoose'

export interface IMessage {
  conversation: Types.ObjectId
  sender: Types.ObjectId
  message: string
  attachments: string[]
}

export interface IMessageDoc extends IMessage, Document {}
