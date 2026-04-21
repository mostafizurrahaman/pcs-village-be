import { validateRequest } from '@app/middlewares'
import { auth } from '@app/middlewares/auth'
import express, { Router } from 'express'
import { AuthRoles } from 'packages/db/src'
import { conversationValidations } from './conversation.validations'
import { conversationController } from './conversation.controllers'

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

export const conversationRoutes = router
