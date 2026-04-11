import { auth } from '@app/middlewares/auth'
import express, { Router } from 'express'
import { AuthRoles } from 'packages/db/src'
import { groupControllers } from './group.controllers'
import { validateRequest } from '@app/middlewares'
import { groupValidations } from './group.validtions'

const router: Router = express.Router()

router.post(
  '/join/:id',
  auth(AuthRoles.USER),
  validateRequest(groupValidations.joinGroup),
  groupControllers.joinGroup
)

router.post('/mark-as-arrived', auth(AuthRoles.USER), groupControllers.markAsArrived)

router.get(
  '/all',
  auth(AuthRoles.USER),
  validateRequest(groupValidations.getUserAllGroups),
  groupControllers.getAllGroups
)

router.post(
  '/leave/:id',
  auth(AuthRoles.USER),
  validateRequest(groupValidations.leaveGroup),
  groupControllers.leaveGroupById
)

router.get(
  '/member/:id',
  auth(AuthRoles.USER),
  // validateRequest(groupValidations.getAllGroupMembersById),
  groupControllers.getGroupAllMembers
)

export const groupRoutes = router
