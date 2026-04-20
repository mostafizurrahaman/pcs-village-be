import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'

import { getUserFromRequest } from '@app/libs/get-user-from-requests'
import { GroupCommentServices } from './group-post-comment.services'
import type { TGetAllCommentsByPostIdQuery } from './group-post-comment.validations'

const createComment = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const files = req.files as Express.Multer.File[]
  const result = await GroupCommentServices.createComment(user, req.body, files)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Comment added successfully',
    data: result,
  })
})

const getCommentsByPostId = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)

  const result = await GroupCommentServices.getAllCommentsByPostID(
    user,
    req.params.postId as string,
    req.query as unknown as TGetAllCommentsByPostIdQuery
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Comments retrieved successfully',
    data: result.data,
    meta: result.meta,
  })
})

const deleteComment = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  await GroupCommentServices.deleteComment(user, req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Comment deleted successfully',
    data: null,
  })
})

export const GroupCommentControllers = {
  createComment,
  getCommentsByPostId,
  deleteComment,
}
