import { validateRequest } from '@app/middlewares'
import express, { Router } from 'express'
import { AuthRoles } from 'packages/db/src'
import { auth } from '@app/middlewares/auth'
import { multerFactory } from 'packages/media-hub/src'
import { CommunityCommentValidations } from './community-post-comments.validations'
import { communityCommentController } from './community-post-comments.controllers'

const router: Router = express.Router()

// 1. Community Comment Create:
router.post(
  '/',
  auth(AuthRoles.USER),
  multerFactory({
    category: 'image',
    maxSizeInMB: 5,
  }).array('attachments', 5),
  validateRequest(CommunityCommentValidations.createComment),
  communityCommentController.createComment
)

router.get(
  '/:id',
  auth(AuthRoles.USER),
  validateRequest(CommunityCommentValidations.getCommentById),
  communityCommentController.getCommunityPostById
)

router.delete(
  '/:id',
  auth(AuthRoles.USER),
  validateRequest(CommunityCommentValidations.deleteCommentById),
  communityCommentController.deleteCommentById
)

router.get(
  '/:postId/all',
  auth(AuthRoles.USER),
  validateRequest(CommunityCommentValidations.getAllCommentsByPostId),
  communityCommentController.getAllCommentsByPostID
)

export const communitCommentRoutes = router
