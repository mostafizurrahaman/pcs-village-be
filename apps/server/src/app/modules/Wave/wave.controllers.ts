import { getUserFromRequest } from '@app/libs/get-user-from-requests'
import { catchAsync, sendResponse } from 'packages/shared/src'
import httpStatus from 'http-status'
import { waveServices } from './wave.services'

const createWave = catchAsync(async (req, res) => {
  const payload = req.body
  const user = await getUserFromRequest(req)

  const result = await waveServices.createWave(user, payload)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: `Wave send successfully!`,
    data: result,
  })
})

export const waveControllers = {
  createWave,
}
