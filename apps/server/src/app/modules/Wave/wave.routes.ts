import { validateRequest } from '@app/middlewares'
import express, { Router } from 'express'
import { waveValidations } from './wave.validations'
import { AuthRoles } from 'packages/db/src'
import { auth } from '@app/middlewares/auth'
import { waveControllers } from './wave.controllers'

const router: Router = express.Router()

router.post(
  '/',
  auth(AuthRoles.USER),
  validateRequest(waveValidations.createWave),
  waveControllers.createWave
)



router.post(
  '/accept/:id',
  auth(AuthRoles.USER),
  validateRequest(waveValidations.acceptWave),
  waveControllers.acceptWave
)


export const waveRoutes = router
