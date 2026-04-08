import { model, Schema } from 'mongoose'
import type { IGroupSuggestionDoc } from './group-suggestion.interface'

const groupSuggestionSchema = new Schema<IGroupSuggestionDoc>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unqiue: true,
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      unqiue: true,
    },
    isDissmiss: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export const GroupSuggestion = model<IGroupSuggestionDoc>('GroupSuggestion', groupSuggestionSchema)
