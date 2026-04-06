import type { Document } from 'mongoose'

export interface IContent {
  aboutUs: string
  privacyPolicy: string
  termsAndCondition: string
}

export interface IContentDocument extends IContent, Document {}
