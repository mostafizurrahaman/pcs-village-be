import type { Document, Types } from 'mongoose'
import { WaveStatus } from './wave.constant'

export type TWaveStatus = keyof typeof WaveStatus

export interface IWave {
  sender: Types.ObjectId
  receiver: Types.ObjectId
  status: TWaveStatus
  createdAt: Date
  updatedAt: Date
}

export interface IWaveDoc extends IWave, Document {}
