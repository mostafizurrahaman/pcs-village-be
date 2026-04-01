import mongoose from 'mongoose'

import httpStatus from 'http-status'
import type { IErrorSources, ISendErrorResponse } from '../types'

export const handleCastError = (err: mongoose.Error.CastError): ISendErrorResponse => {
  const errorSources: IErrorSources[] = [
    {
      path: err.path,
      message: err.message,
    },
  ]
  return {
    statusCode: httpStatus.BAD_REQUEST,
    message: 'Invalid ID',
    errorSources,
  }
}


