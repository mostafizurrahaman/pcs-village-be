import { model, Schema } from 'mongoose'
import type { IMessageDoc } from './message.interface'

const messageSchema = new Schema<IMessageDoc>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    attachments: {
      type: [String],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export const Message = model<IMessageDoc>('Message', messageSchema)
