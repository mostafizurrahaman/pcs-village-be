import { validateRequest } from '@app/middlewares'
import express, { Router } from 'express'

import { communityPostValidations } from './community-posts.validations'
import { communityPostControllers } from './community-post.controllers'
import { AuthRoles } from 'packages/db/src'
import { auth } from '@app/middlewares/auth'
import { multerFactory } from 'packages/media-hub/src'

const router: Router = express.Router()

// 1. Community Post Create:
router.post(
  '/',
  auth(AuthRoles.USER),
  multerFactory({
    category: 'image',
    maxSizeInMB: 5,
  }).array('attachments', 5),
  validateRequest(communityPostValidations.createCommunityPost),
  communityPostControllers.createCommunityPost
)

// 6. Get all the post  for the user (Current and future stations)
router.get('/relevant', auth(AuthRoles.USER), communityPostControllers.getUserCommunityPosts)

// 2. Community Post Delete Attachments:
router.delete(
  '/attachments/:id',
  auth(AuthRoles.USER),
  validateRequest(communityPostValidations.deleteCommunityPostAttachmentById),
  communityPostControllers.deleteCommunityPostAttachment
)

// 3. Community Post Update:
router.patch(
  '/:id',
  auth(AuthRoles.USER),
  multerFactory({
    category: 'image',
    maxSizeInMB: 5,
  }).array('attachments', 5),
  validateRequest(communityPostValidations.updateCommunityPost),
  communityPostControllers.updateCommunityPost
)

// 4. Community Post GET (SINGLE):
router.get(
  '/:id',
  auth(AuthRoles.USER),
  validateRequest(communityPostValidations.getCommunityPostById),
  communityPostControllers.getCommunityPostById
)

// 5. Community Post DELETE (SINGLE):
router.delete(
  '/:id',
  auth(AuthRoles.USER),
  validateRequest(communityPostValidations.deleteCommunityPostById),
  communityPostControllers.deleteCommunityPostById
)

export const communityPostRoutes = router
