/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */

import httpStatus from 'http-status'
import { ZodError } from 'zod'
import configs from '../configs'
import type { ErrorRequestHandler } from 'express'
import {
  AppError,
  handleCastError,
  handleDuplicateError,
  handleValidationError,
  handleZodError,
  type IErrorSources,
} from '@repo/shared'

const globalErrorHandler: ErrorRequestHandler = async (err, req, res, next) => {
  // default setting here:
  // console.log(err);
  let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR
  let message: string = 'Something Went Wrong!!!'

  let errorSources: IErrorSources[] = [
    {
      path: '',
      message: 'Something went wrong!!!',
    },
  ]

  if (err instanceof ZodError) {
    // call zod error handler func:
    const simplifiedError = handleZodError(err)

    statusCode = simplifiedError.statusCode
    message = simplifiedError.message
    errorSources = simplifiedError.errorSources
  } else if (err?.name === 'ValidationError') {
    const simplifiedError = handleValidationError(err)
    statusCode = simplifiedError.statusCode
    message = simplifiedError.message
    errorSources = simplifiedError.errorSources
  } else if (err?.name === 'CastError') {
    const simplifiedError = handleCastError(err)
    statusCode = simplifiedError.statusCode
    message = simplifiedError.message
    errorSources = simplifiedError.errorSources
  } else if (err?.code === 11000) {
    const simplifiedError = handleDuplicateError(err)
    statusCode = simplifiedError.statusCode
    message = simplifiedError.message
    errorSources = simplifiedError.errorSources
  } else if (err instanceof AppError) {
    statusCode = err.statusCode
    message = err.message
    errorSources = [
      {
        path: '',
        message: err?.message,
      },
    ]
  } else if (err instanceof Error) {
    message = err?.message
  }

  return res.status(statusCode).send({
    success: false,
    message,
    errorSources,
    // err,
    stack: configs.nodeEnv === 'development' ? err.stack : null,
  })
}

export default globalErrorHandler
