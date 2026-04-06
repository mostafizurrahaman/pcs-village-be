import { getUserFromRequest } from '@app/libs/get-user-from-requests'
import { catchAsync, sendResponse } from '@repo/shared'
import { CommunityPostComments } from './community-post-comments.services'
import httpStatus from 'http-status'
import type { TGetAllCommentsByPostQuery } from './community-post-comments.validations'

// 1. Create Community Post:
const createComment = catchAsync(async (req, res) => {
  const body = req.body
  const user = await getUserFromRequest(req)
  const files = req.files as Express.Multer.File[]

  const result = await CommunityPostComments.createComment(user, body, files)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The comment published successfully!',
    data: result,
  })
})

// 2. Get Community Post by id:
const getCommunityPostById = catchAsync(async (req, res) => {
  const commentId = req.params.id as string

  const result = await CommunityPostComments.getCommentById(commentId)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The post is retrived successfully!',
    data: result,
  })
})

//3. Get all the comments by post id:
const getAllCommentsByPostID = catchAsync(async (req, res) => {
  const postId = req.params.postId as string
  const user = await getUserFromRequest(req)
  const query = req.query as unknown as TGetAllCommentsByPostQuery

  const result = await CommunityPostComments.getAllCommentsByPostID(user, postId, query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The post is retrived successfully!',
    data: result.data,
    meta: result.meta,
  })
})

// 2. Get Community Post by id:
const deleteCommentById = catchAsync(async (req, res) => {
  const commentId = req.params.id as string
  const user = await getUserFromRequest(req)
  const result = await CommunityPostComments.deleteCommentById(user, commentId)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The comment has been deleted successfully!',
    data: result,
  })
})

export const communityCommentController = {
  createComment,
  getCommunityPostById,
  getAllCommentsByPostID,
  deleteCommentById,
}
