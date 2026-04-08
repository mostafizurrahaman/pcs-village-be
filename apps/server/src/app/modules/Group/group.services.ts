import {
  DutyStation,
  Group,
  GroupMember,
  GroupSuggestion,
  GroupTabs,
  GroupType,
  MembershipStatus,
  UserProfile,
  type IUser,
  type TGroupTabType,
  type TGroupType,
} from 'packages/db/src'
import { AppError, getPcsWindow } from 'packages/shared/src'
import httpStatus from 'http-status'
import configs from '@app/configs'
import mongoose, { type PipelineStage } from 'mongoose'

// 1. Find or create group:
const findOrCreateSuggestedGroup = async (payload: {
  userId: string
  futureStationId?: string
  pcsDate?: string
}) => {
  const { futureStationId, pcsDate, userId } = payload

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

  // Update the suggested Group:
  // 8. Update user suggested group:
  await GroupSuggestion.findOneAndUpdate(
    {
      user: userId,
    },
    {
      $set: {
        group: group?._id,
      },
    },
    {
      upsert: true,
      new: true,
    }
  )

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

  await GroupSuggestion.findOneAndUpdate(
    {
      user: user?._id,
    },
    {
      group: group?._id,
      isDissmiss: true,
    },
    {
      new: true,
    }
  )

  return member
}

// 3. MarkAsArrived:
const markAsArrived = async (user: IUser) => {
  // 1. Check is the user profile exists?:
  const profile = await UserProfile.findOne({ user: user?._id })
  if (!profile) {
    throw new AppError(httpStatus.NOT_FOUND, `User profile doesn't exists!`)
  }

  // 2. Check future movement :
  if (!profile.futureStation || !profile.estimatedPcsDate) {
    throw new AppError(httpStatus.NOT_FOUND, `No future move found to mark as arrived.`)
  }

  // 3. Early arrival restriction:
  const today = new Date()
  const pcsDate = new Date(profile.estimatedPcsDate)
  const timeDiff = pcsDate.getTime() - today.getTime()
  const daysUntilPcs = timeDiff / (60 * 60 * 24 * 1000)
  if (daysUntilPcs > 60) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `It's too early to mark as arrived. Please wait until you are closer to your PCS date.`
    )
  }

  // 4. Exchange stations:
  const newCurrentStation = profile.futureStation
  const arrivalDate = new Date()
  const currentWindow = getPcsWindow(arrivalDate)

  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    // 5. update the profile with new information :
    await UserProfile.findOneAndUpdate(
      {
        user: user?._id,
      },
      {
        $set: {
          currentStation: newCurrentStation,
          futureStation: null,
          estimatedPcsDate: null,
          isArrived: true,
        },
      },
      {
        session,
      }
    )

    //6. Archive all previous active group:
    await GroupMember.updateMany(
      {
        user: user?._id,
        status: MembershipStatus.ACTIVE,
      },
      {
        $set: {
          status: MembershipStatus.ARCHIVED,
          archivedAt: new Date(),
        },
      },
      {
        session,
      }
    )

    // 7. Find or create new Commer group:
    const newCommerGroup = await Group.findOneAndUpdate(
      {
        station: newCurrentStation,
        timeline: currentWindow,
        type: GroupType.NEWCOMER,
      },
      {
        $setOnInsert: {
          station: newCurrentStation,
          timeline: currentWindow,
          type: GroupType.NEWCOMER,
          createdAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
      }
    )

    // 8. Update user suggested group:
    await GroupSuggestion.findOneAndUpdate(
      {
        user: user?._id,
      },
      {
        $set: {
          group: newCommerGroup?._id,
        },
      },
      {
        upsert: true,
        new: true,
      }
    )

    return {
      newStation: newCurrentStation,
      suggestedGroup: newCommerGroup,
    }
  } catch (error) {
    console.log(error)
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to mark as arrived!`)
  }
}

// 4. Get Groups based on tabs:
const getAllGroups = async (user: IUser, query: Record<string, unknown>) => {
  // 1. Check is the user profile exists?:
  const profile = await UserProfile.findOne({ user: user?._id })
  if (!profile) {
    throw new AppError(httpStatus.NOT_FOUND, `User profile doesn't exists!`)
  }

  const pipeline: PipelineStage[] = []

  if (query.tab === GroupTabs.SUGGESTED) {
    const groups = await GroupSuggestion.aggregate([
      {
        $match: {
          user: user?._id,
          isDissmiss: false,
        },
      },
      {
        $lookup: {
          from: 'groups',
          localField: 'group',
          foreignField: '_id',
          as: 'groupDetails',
          pipeline: [
            {
              $lookup: {
                from: 'dutystations',
                localField: 'station',
                foreignField: '_id',
                as: 'station',
                pipeline: [],
              },
            },
            {
              $lookup: {
                from: 'groupmembers',
                let: {
                  groupId: '$_id',
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ['$$groupId', '$group'],
                      },
                    },
                  },
                ],
                as: 'members',
              },
            },
            {
              $unwind: {
                path: '$station',
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: '$groupDetails',
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: '$groupDetails._id',
          type: '$groupDetails.type',
          timeline: '$groupDetails.time',
          groupName: {
            $concat: [
              '$groupDetails.station.name',
              ' - ',
              '$groupDetails.type',
              ' - ',
              '$groupDetails.timeline',
            ],
          },
          stationId: '$groupDetails.station._id',
          stationName: '$groupDetails.station.name',
          stationCity: '$groupDetails.station.city',
          stationType: '$groupDetails.station.type',
          stationState: '$groupDetails.station.state',
          stationCountry: '$groupDetails.station.country',
          createdAt: '$groupDetails.createdAt',
          members: '$groupDetails.members',
          totalMember: {
            $size: '$groupDetails.members',
          },
          // TODO: Has to works for leave handling:
        },
      },
    ])

    return groups

    console.log(groups)
  }
}

export const groupServices = {
  findOrCreateSuggestedGroup,
  joinGroup,
  markAsArrived,
  getAllGroups,
}
