import type { Document } from 'mongoose'

export interface IFaq {
  question: string
  answer: string
}

export interface IFaqDocuemtns extends IFaq, Document {}
