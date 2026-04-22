import { catchAsync, sendResponse } from 'packages/shared/src'
import { subscriptionPlanServices } from './subscription-plan.services'
import httpStatus from 'http-status'

// 1. create subscription plan:
const createSubscriptionPlan = catchAsync(async (req, res) => {
  const payload = req.body

  const result = await subscriptionPlanServices.createPlan(payload)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Subscription plan is created successfully!`,
    data: result,
  })
})

// 1. get all plans
const getAllPlans = catchAsync(async (req, res) => {
  const query = req.query

  const result = await subscriptionPlanServices.getAllPlans(query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Retreived all subscription plan successfully!!`,
    data: result.data,
    meta: result.meta,
  })
})

export const subscriptionPlanController = {
  createSubscriptionPlan,
  getAllPlans,
}
