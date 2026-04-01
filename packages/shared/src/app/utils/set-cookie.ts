import type { Response } from 'express'
export interface SetCookieOptions {
  maxAge?: number // in milliseconds
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
  path?: string
}

/**
 * Sets an HTTP cookie safely
 */
export const setCookie = (
  res: Response,
  name: string,
  value: string,
  options: SetCookieOptions = {}
): void => {
  res.cookie(name, value, {
    httpOnly: options.httpOnly ?? true,
    secure: options.secure,
    sameSite: options.sameSite ?? 'lax',
    maxAge: options.maxAge ?? 1000 * 60 * 60 * 24, // 1 day
    path: options.path ?? '/',
  })
}
