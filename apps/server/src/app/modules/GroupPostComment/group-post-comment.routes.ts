import { Router } from 'express'

import { AuthRoles } from '@repo/db'
import { multerFactory } from 'packages/media-hub/src'

import { auth } from '@app/middlewares/auth'
import { validateRequest } from '@app/middlewares'
import { GroupCommentValidations } from './group-post-comment.validations'
import { GroupCommentControllers } from './group-post-comment.controllers'

const router : Router= Router()

router.post(
  '/',
  auth(AuthRoles.USER),
  multerFactory({ category: 'image', maxSizeInMB: 2 }).array('attachments', 3),
  validateRequest(GroupCommentValidations.createComment),
  GroupCommentControllers.createComment
)

router.get(
  '/post/:postId',
  auth(AuthRoles.USER),
  validateRequest(GroupCommentValidations.getAllCommentsByPostId),
  GroupCommentControllers.getCommentsByPostId
)

router.delete('/:id', auth(AuthRoles.USER), GroupCommentControllers.deleteComment)

export const groupCommentRoutes = router
