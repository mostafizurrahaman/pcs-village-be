import { model, Schema } from 'mongoose'

import type { IFaqDocuemtns } from './faq.interface'

export const faqSchema = new Schema<IFaqDocuemtns>(
  {
    question: {
      type: String,
      default: '',
    },
    answer: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
)

export const Faq = model<IFaqDocuemtns>('Faq', faqSchema)
