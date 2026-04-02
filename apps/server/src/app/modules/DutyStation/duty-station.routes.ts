import { validateRequest } from '@app/middlewares'
import express, { Router } from 'express'
import { DutyStationValidation } from './duty-station.valiations'
import { dutyStationControllers } from './duty-station.controllers'
import { auth } from '@app/middlewares/auth'
import { AuthRoles } from 'packages/db/src'

const router = express.Router()

// Create a new DutyStation
router.post(
  '/',
  auth(AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN, AuthRoles.USER),
  validateRequest(DutyStationValidation.createDutyStation),
  dutyStationControllers.createDutyStation
)

// Update an existing DutyStation by ID
router.patch(
  '/:id',
  auth(AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN),
  validateRequest(DutyStationValidation.updateDutyStation),
  dutyStationControllers.updateDutyStation
)

// Get all DutyStationes
router.get(
  '/all',
  validateRequest(DutyStationValidation.getAllDutyStations),
  dutyStationControllers.getAllDutyStationes
)

// Get a single DutyStation by ID
router.get(
  '/:id',
  validateRequest(DutyStationValidation.getDutyStationById),
  dutyStationControllers.getDutyStationById
)

// Delete a DutyStation by ID
router.delete(
  '/:id',
  auth(AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN),
  validateRequest(DutyStationValidation.deleteDutyStationById),
  dutyStationControllers.deleteDutyStationById
)

export const DutyStationRoutes: Router = router
