import { validateRequest } from '@app/middlewares'
import express, { Router } from 'express'
import { postLikeValidation } from './post-like.validation'
import { postLikeControllers } from './post-like.controllers'
import { auth } from '@app/middlewares/auth'
import { AuthRoles } from 'packages/db/src'

const router: Router = express.Router()

router.post(
  '/:postId',
  auth(AuthRoles.USER),
  validateRequest(postLikeValidation.tooggleLike),
  postLikeControllers.toggleLike
)

export const communityLikeRoutes = router
