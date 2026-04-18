import type { Document, Types } from 'mongoose'
import type { reportStatus } from './reports.constant'

export type TReportStatus = keyof typeof reportStatus

export interface IReport {
  post: Types.ObjectId
  postModel: 'CommunityPost' | 'GroupPost'
  reporter: Types.ObjectId
  reason: string
  isGroup: boolean
  status: TReportStatus
}

export interface IReportDoc extends Document, IReport {}

// followup : to mark mike
