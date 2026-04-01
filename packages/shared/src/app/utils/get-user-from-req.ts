/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Request } from 'express'
import type { IJwtUserPayload } from '../types'
export const getUserFromRequest = (req: Request) => {
  const user = (req as any).user as IJwtUserPayload
  return user
}
