import mongoose from 'mongoose'

import httpStatus from 'http-status'
import type { IErrorSources, ISendErrorResponse } from '../types'

export const handleValidationError = (err: mongoose.Error.ValidationError): ISendErrorResponse => {
  const errorSources: IErrorSources[] = Object.values(err.errors).map(
    (val: mongoose.Error.ValidatorError | mongoose.Error.CastError) => {
      return {
        path: val.path,
        message: val.message,
      }
    }
  )

  const statusCode: number = httpStatus.BAD_REQUEST

  return {
    statusCode,
    message: 'Validation Error',
    errorSources,
  }
}

