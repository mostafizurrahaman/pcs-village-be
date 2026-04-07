import type { Document, Types } from 'mongoose'
import type { GroupType } from './group.constant'

export type TGroupType = keyof typeof GroupType

export interface IGroup {
  station?: Types.ObjectId
  timeline: string // e.g., "2026-Q3"
  type: TGroupType
}

export interface IGroupDocuments extends Document, IGroup {}
