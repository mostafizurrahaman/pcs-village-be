import { model, Schema } from 'mongoose'
import type { IConversationDoc } from './conversation.interface'

const conversationSchema = new Schema<IConversationDoc>(
  {
    participant: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    initiator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export const Conversation = model<IConversationDoc>('Conversation', conversationSchema)
