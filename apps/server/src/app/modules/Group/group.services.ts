import { DutyStation, Group, GroupType, type TGroupType } from 'packages/db/src'
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

export const groupServices = {
  findOrCreateSuggestedGroup,
}
