import {
  DutyStation,
  Group,
  GroupMember,
  GroupType,
  MembershipStatus,
  UserProfile,
  type IUser,
  type TGroupType,
} from 'packages/db/src'
import { AppError, getPcsWindow } from 'packages/shared/src'
import httpStatus from 'http-status'
import configs from '@app/configs'

// 1. Find or create group:
const findOrCreateSuggestedGroup = async (payload: {
  futureStationId?: string
  pcsDate?: string
}) => {
  const { futureStationId, pcsDate } = payload

  if (!pcsDate || !futureStationId) return null

  const timeline = getPcsWindow(pcsDate)
  let type: TGroupType = GroupType.ARRIVAL

  //   check is the future station exists?:
  const futureStation = await DutyStation.findById(futureStationId)

  if (!futureStation) {
    throw new AppError(httpStatus.NOT_FOUND, `Future station doesn't exists!`)
  }

  if (futureStation.name?.toLowerCase() === configs.base.name?.toLowerCase()) {
    type = GroupType.CLASSIFIED
  }

  // Find the group :
  let group = await Group.findOne({
    station: futureStationId,
    timeline,
    type,
  })

  // If not exists create:
  if (!group) {
    group = await Group.create({
      station: futureStationId,
      timeline,
      type,
    })
  }

  return group._id
}

// 2. Join Into Group :
const joinGroup = async (user: IUser, groupId: string) => {
  // 1. Check is the user profile exists?:
  const profile = await UserProfile.findOne({ user: user?._id })
  if (!profile) {
    throw new AppError(httpStatus.NOT_FOUND, `User profile doesn't completed!`)
  }

  // 2. Check is group exists:
  const group = await Group.findById(groupId)
  if (!group) {
    throw new AppError(httpStatus.NOT_FOUND, `Group doesn't exists!`)
  }

  // 3. Check time frame if it's is Arrival group:
  if (group.type === GroupType.ARRIVAL || group.type === GroupType.CLASSIFIED) {
    const userWindow = getPcsWindow(profile?.estimatedPcsDate)
    if (userWindow !== group.timeline) {
      throw new AppError(
        httpStatus.CONFLICT,
        `You are trying to join a group that doesn't match your move date.`
      )
    }
  }

  // 4. If the group type is NEWCOMMER
  if (group.type === GroupType.NEWCOMER) {
    const userWindow = getPcsWindow(new Date())

    if (!profile.isArrived) {
      throw new AppError(400, "You haven't reached your base yet! Join an Arrival group instead.")
    }

    if (userWindow !== group.timeline) {
      throw new AppError(
        httpStatus.CONFLICT,
        "You can only join the current quarter's newcomer group."
      )
    }
  }

  // 5. Archive previous group memeber ship:
  await GroupMember.updateMany(
    {
      user: user?._id,
      status: MembershipStatus.ACTIVE,
    },
    {
      status: MembershipStatus.ARCHIVED,
      archivedAt: new Date(),
    }
  )

  // 6. Check is here already a member of this group?:
  const existingMember = await GroupMember.findOne({ user: user?._id, group: groupId })
  if (existingMember) {
    existingMember.status = 'ACTIVE'
    await existingMember.save()
    return existingMember
  }

  const member = await GroupMember.create({
    user: user?._id,
    status: MembershipStatus.ACTIVE,
    group: group?._id,
    joinedAt: new Date(),
  })

  return member
}

export const groupServices = {
  findOrCreateSuggestedGroup,
}
