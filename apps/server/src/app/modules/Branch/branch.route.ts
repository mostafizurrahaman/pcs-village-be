import { validateRequest } from '@app/middlewares'
import express, { Router } from 'express'
import { BranchValidation } from './branch.validations'
import { branchControllers } from './branch.controllers'

const router = express.Router()

// Create a new branch
router.post('/', validateRequest(BranchValidation.createBranch), branchControllers.createBranch)

// Update an existing branch by ID
router.patch('/:id', validateRequest(BranchValidation.updateBranch), branchControllers.updateBranch)

// Get all branches
router.get(
  '/all',
  validateRequest(BranchValidation.getAllBrnaches),
  branchControllers.getAllBranches
)

// Get a single branch by ID
router.get('/:id', validateRequest(BranchValidation.getBranchById), branchControllers.getBranchById)

// Delete a branch by ID
router.delete(
  '/:id',
  validateRequest(BranchValidation.deleteBranchById),
  branchControllers.deleteBranchById
)



export const branchRoutes : Router = router