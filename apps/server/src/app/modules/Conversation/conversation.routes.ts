import { validateRequest } from '@app/middlewares'
import { auth } from '@app/middlewares/auth'
import express, { Router } from 'express'
import { AuthRoles } from 'packages/db/src'
import { conversationValidations } from './conversation.validations'
import { conversationController } from './conversation.controllers'
import { checkSubscriptionAccess } from '@app/middlewares/validate-subscrption'
import { multerFactory } from 'packages/media-hub/src'

const router: Router = express.Router()

router.get(
  '/',
  auth(AuthRoles.USER),
  validateRequest(conversationValidations.getAllConversations),
  conversationController.getAllConversations
)

router.get(
  '/messages',
  auth(AuthRoles.USER),
  validateRequest(conversationValidations.getAllMessages),
  conversationController.getAllMessageForConversation
)
router.post(
  '/upload',
  multerFactory({
    category: 'image',
    maxSizeInMB: 5,
  }).array('attachments', 5),
  auth(AuthRoles.USER),
  checkSubscriptionAccess(),

  conversationController.uploadAttachments
)

export const conversationRoutes = router
