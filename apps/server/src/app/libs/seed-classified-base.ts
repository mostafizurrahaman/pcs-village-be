import configs from '@app/configs'
import { AuthRoles, DutyStation, User } from 'packages/db/src'
import { AppError } from 'packages/shared/src'
import httpStatus from 'http-status'

export const seedClassifiedBase = async () => {
  const existingClassifiedBase = await DutyStation.findOne({
    name: configs.base.name,
  })

  if (!existingClassifiedBase) {
    const superAdmin = await User.findOne({
      role: AuthRoles.SUPER_ADMIN,
    }).select({ _id: 1 })

    if (!superAdmin) {
      throw new AppError(httpStatus.NOT_FOUND, `Admin doesn't exists!`)
    }
    await DutyStation.create({
      name: configs.base.name,
      country: 'global',
      state: 'global',
      city: 'global',
      type: 'BASE',
      isDeleteable: false,
      suggestedBy: superAdmin?._id,
      isApproved: true,
    })
  }
}
