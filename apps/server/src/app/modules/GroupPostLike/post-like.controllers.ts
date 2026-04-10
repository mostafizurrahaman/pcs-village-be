// 1. Toggle like/unlike:

import { catchAsync, sendResponse } from '@repo/shared'
import { postLikeServices } from './post-like.services'
import { getUserFromRequest } from '@app/libs/get-user-from-requests'
import httpStatus from 'http-status'

const toggleLike = catchAsync(async (req, res) => {
  const postId = req.params.postId as string
  const user = await getUserFromRequest(req)
  const result = await postLikeServices.toggleLike(user, postId)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Liked ${result?.message} successfully!`,
    data: result,
  })
})

export const postLikeControllers = {
  toggleLike,
}
