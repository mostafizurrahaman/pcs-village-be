// well : Well, I usually spend my free time watching videos and chatting with my friends.
// actually: Actully, I kind of enjoy play football, and then I love to play cricket.
// basically
// You know, I living in a village which called "HAMCHADI" in Bengli.  To be honest, I don't know the meaning of the name, but I beleive the village is deeply connected with our traditions.
// let me think
//

import type { DutyStationType } from '@repo/db'
import { baseRequestStatus } from './base-request.constant'
import type { Document } from 'mongoose'

export type TBaseRequestStatus = keyof typeof baseRequestStatus

export interface IBaseRequest {
  name: string
  email: string
  country: string
  state: string
  city: string
  type: DutyStationType
  status: TBaseRequestStatus
  adminNote?: string
  approvedAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface IBaseRequestDoc extends Document, IBaseRequest {}
