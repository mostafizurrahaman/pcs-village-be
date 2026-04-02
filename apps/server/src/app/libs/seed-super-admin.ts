import configs from '@app/configs'
import { AuthRoles, AuthStatus, User } from '@repo/db'
import { AppError, hashPassword } from '@repo/shared'
import httpStatus from 'http-status'
import { logger } from './logger'

export const seedSuperAdmin = async () => {
  const payload = {
    name: 'Super Admin',
    email: configs.superAdmin.email,
    phoneNumber: '',
    password: await hashPassword(configs.superAdmin.password, configs.passwordSoltRound),
    role: AuthRoles.SUPER_ADMIN,
    status: AuthStatus.ACTIVE,
    profileImage: '',
    isProfile: true,
    isOtpVerified: true,
  }

  const user = await User.findOne({ email: configs.superAdmin.email })
  try {
    if (user) {
      logger.debug('Super admin already exists. Skipping creation...')
      throw new AppError(httpStatus.CONFLICT, 'Super Admin already exists')
    }

    await User.create(payload)
    logger.info('Super admin created successfully')
  } catch (error) {
    logger.error('Error creating super admin:', error)
  }
}
