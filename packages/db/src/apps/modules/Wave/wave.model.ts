import { model, Schema } from 'mongoose'
import type { IWave } from './wave.interface'
import { WaveStatus, waveStatusValues } from './wave.constant'

const waveSchema = new Schema<IWave>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: waveStatusValues,
      default: WaveStatus.PENDING,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export const Wave = model<IWave>('Wave', waveSchema)


