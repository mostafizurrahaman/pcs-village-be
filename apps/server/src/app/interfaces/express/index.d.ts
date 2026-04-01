import type { IUser } from '@repo/db'

declare global {
  namespace Express {
    interface Request {
      user: IUser
    }
  }
}

export {}
