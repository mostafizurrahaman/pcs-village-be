/* eslint-disable @typescript-eslint/no-explicit-any */
import jwt from 'jsonwebtoken'
import type { IJwtUserPayload } from '../types'
import { AppError } from '../errors'
import httpStatus from 'http-status'
// 1. Create Token
export const createToken = (
  payload: IJwtUserPayload,
  privateKey: string,
  expiresIn: string | number
) => {
  try {
    const token = jwt.sign(payload, privateKey, {
      expiresIn: expiresIn as number,
    })
    return token
  } catch (error: any) {
    throw new AppError(httpStatus.FORBIDDEN, error.message)
  }
}

// 2. Verify jwt token:
export const verifyToken = (token: string, privateKey: string): IJwtUserPayload => {
  try {
    const decoded = jwt.verify(token, privateKey) as IJwtUserPayload
    return decoded as IJwtUserPayload
  } catch (error: any) {
    switch (error.name) {
      case 'TokenExpiredError':
        throw new AppError(httpStatus.UNAUTHORIZED, 'JWT token has expired')
      case 'JsonWebTokenError':
        throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid JWT token')
      case 'NotBeforeError':
        throw new AppError(httpStatus.UNAUTHORIZED, 'JWT token not active yet')
      default:
        throw new AppError(httpStatus.FORBIDDEN, 'Failed to verify JWT token')
    }
  }
}
