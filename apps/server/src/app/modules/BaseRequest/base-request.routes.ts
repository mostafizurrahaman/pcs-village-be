import { validateRequest } from '@app/middlewares'
import express, { Router } from 'express'
import { BaseRequestValidation } from './base-request.valiations'
import { baseRequestControllers } from './base-request.controllers'
import { auth } from '@app/middlewares/auth'
import { AuthRoles } from '@repo/db'

const router = express.Router()

// Create a new BaseRequest
router.post(
  '/',
  validateRequest(BaseRequestValidation.createBaseRequest),
  baseRequestControllers.createBaseRequest
)

// Get all BaseRequests
router.get(
  '/all',
  validateRequest(BaseRequestValidation.getAllBaseRequestes),
  baseRequestControllers.getAllBaseRequests
)

// Get a single BaseRequest by ID
router.get(
  '/:id',
  validateRequest(BaseRequestValidation.getBaseRequestById),
  baseRequestControllers.getBaseRequestById
)

// Delete a BaseRequest by ID
router.delete(
  '/:id',
  auth(AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN),
  validateRequest(BaseRequestValidation.deleteBaseRequestById),
  baseRequestControllers.deleteBaseRequestById
)

// approve 
router.patch(
  '/:id/resolve',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(BaseRequestValidation.resolveRequestSchema),
  baseRequestControllers.resolveRequest
);

export const baseRequestRoutes: Router = router
