/* eslint-disable @typescript-eslint/no-explicit-any */

import type { IErrorSources, ISendErrorResponse } from '../types'
import httpStatus from 'http-status'

export const handleDuplicateError = (err: any): ISendErrorResponse => {
  const key = Object.keys(err.keyPattern)[0] as string
  const errorSources: IErrorSources[] = [
    {
      path: key,
      message: ` "The ${err.keyValue[key]}"  is already Exists`,
    },
  ]
  const statusCode: number = httpStatus.BAD_REQUEST

  return {
    statusCode,
    message: `Path "${key}" is already Exists`,
    errorSources,
  }
}
