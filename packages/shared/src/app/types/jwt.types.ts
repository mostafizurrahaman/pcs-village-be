import type { JwtPayload } from 'jsonwebtoken'

export interface IJwtUserPayload extends JwtPayload {
  _id: string
  name: string
  email: string
  profileImage: string
  status: string
}
