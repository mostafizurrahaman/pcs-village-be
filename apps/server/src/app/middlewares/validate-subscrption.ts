import httpStatus from 'http-status'
import { Subscription, SubscriptionStatus } from 'packages/db/src'

import { getUserFromRequest } from '@app/libs/get-user-from-requests'
import type { RequestHandler } from 'express'
import { AppError } from 'packages/shared/src'

export const checkSubscriptionAccess = (): RequestHandler => {
  return async (req, res, next) => {
    try {
      const user = await getUserFromRequest(req) // assuming auth middleware already sets req.user

      if (!user?._id) {
        return next(new AppError(httpStatus.UNAUTHORIZED, 'Unauthorized'))
      }

      const sub = await Subscription.findOne({
        user: user?._id,
        status: {
          $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED],
        },
        currentPeriodEnd: { $gt: new Date() },
      })

      // Block if no valid subscription
      if (!sub) {
        return next(
          new AppError(httpStatus.PAYMENT_REQUIRED, 'Please update your subscription plan!')
        )
      }

      // allow request to continue
      return next()
    } catch (error) {
      return next(error)
    }
  }
}
