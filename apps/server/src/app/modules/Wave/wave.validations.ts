import { requiredString } from 'packages/shared/src'
import z from 'zod'

const createWave = z.object({
  body: z.object({
    receiver: requiredString('Reciver ID'),
  }),
})

export const waveValidations = {
  createWave,
}

export type ICreateWavePayload = z.infer<typeof createWave.shape.body>
