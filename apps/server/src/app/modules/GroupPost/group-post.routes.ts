import { validateRequest } from '@app/middlewares'
import express, { Router } from 'express'

import { AuthRoles } from 'packages/db/src'
import { auth } from '@app/middlewares/auth'
import { multerFactory } from 'packages/media-hub/src'
import { groupPostValidations } from './group-post.validation'
import { groupPostControllers } from './group-post.controllers'

const router: Router = express.Router()

// 1. Group Post Create:
router.post(
  '/',
  auth(AuthRoles.USER),
  multerFactory({
    category: 'image',
    maxSizeInMB: 5,
  }).array('attachments', 5),
  validateRequest(groupPostValidations.createPost),
  groupPostControllers.createGroupPost
)

// // 6. Get all the post  for the user (Current and future stations)
// router.get('/relevant', auth(AuthRoles.USER), communityPostControllers.getUserCommunityPosts)

// // 2. Group Post Delete Attachments:
router.delete(
  '/attachments/:id',
  auth(AuthRoles.USER),
  validateRequest(groupPostValidations.deleteGroupPostAttachmentById),
  groupPostControllers.deleteGroupPostAttachment
)

// // 3. Community Post Update:
router.patch(
  '/:id',
  auth(AuthRoles.USER),
  multerFactory({
    category: 'image',
    maxSizeInMB: 5,
  }).array('attachments', 5),
  validateRequest(groupPostValidations.updateGroupPost),
  groupPostControllers.updateGroupPost
)

// // 4. Community Post GET (SINGLE):
router.get(
  '/:id',
  auth(AuthRoles.USER),
  validateRequest(groupPostValidations.getPostById),
  groupPostControllers.getPostById
)

// // 5. Community Post DELETE (SINGLE):
// router.delete(
//   '/:id',
//   auth(AuthRoles.USER),
//   validateRequest(communityPostValidations.deleteCommunityPostById),
//   communityPostControllers.deleteCommunityPostById
// )

export const groupPostRoutes = router
