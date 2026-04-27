import { validateRequest } from '@app/middlewares'
import { auth } from '@app/middlewares/auth'
import { checkSubscriptionAccess } from '@app/middlewares/validate-subscrption'
import express, { Router } from 'express'
import { AuthRoles } from 'packages/db/src'
import { AdsValidations } from './ads.validations'
import { adsControllers } from './ads.controllers'
import { multerFactory } from 'packages/media-hub/src'

const router: Router = express.Router()

router.post(
  '/',
  multerFactory({
    category: 'image',
    maxSizeInMB: 5,
  }).single('banner'),
  auth(AuthRoles.USER),
  checkSubscriptionAccess(),
  validateRequest(AdsValidations.createAds),
  adsControllers.createAds
)

router.get(
  '/my',
  auth(AuthRoles.USER),
  validateRequest(AdsValidations.getMyAds),
  adsControllers.getMyAds
)

export const adsRoutes = router
