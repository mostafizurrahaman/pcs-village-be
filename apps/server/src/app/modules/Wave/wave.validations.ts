import { requiredString } from 'packages/shared/src'
import z from 'zod'

const createWave = z.object({
  body: z.object({
    receiver: requiredString('Reciver ID'),
  }),
})


const acceptWave = z.object({
  params: z.object({ 
    id: requiredString('ID')
  })
})

export const waveValidations = {
  createWave,
  acceptWave
}

export type ICreateWavePayload = z.infer<typeof createWave.shape.body>
