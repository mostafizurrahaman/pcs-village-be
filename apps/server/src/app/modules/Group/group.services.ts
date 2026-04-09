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
  type TGroupType,
} from 'packages/db/src'
import { AppError, getPcsWindow } from 'packages/shared/src'
import httpStatus from 'http-status'
import configs from '@app/configs'
import mongoose, { Types, type PipelineStage } from 'mongoose'
import type { TGetUserAllGroupQuery } from './group.validtions'

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
        isDissmiss: false
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
  // 1. Check is the user profile exists (Outside session is fine for read)
  const profile = await UserProfile.findOne({ user: user?._id })
  if (!profile) throw new AppError(httpStatus.NOT_FOUND, `User profile doesn't exist!`)

  if (!profile.futureStation || !profile.estimatedPcsDate) {
    throw new AppError(httpStatus.NOT_FOUND, `No future move found to mark as arrived.`)
  }

  // 2. Early arrival restriction logic
  const today = new Date()
  const pcsDate = new Date(profile.estimatedPcsDate)
  const daysUntilPcs = (pcsDate.getTime() - today.getTime()) / (60 * 60 * 24 * 1000)

  if (daysUntilPcs > 60) {
    throw new AppError(httpStatus.BAD_REQUEST, `Too early to mark as arrived.`)
  }

  const newCurrentStation = profile.futureStation
  const arrivalDate = new Date()
  const currentWindow = getPcsWindow(arrivalDate)

  /**
   * CRITICAL FIX: Find or Create the Group OUTSIDE the transaction.
   * Since this is a shared document among many users, we don't want to lock it
   * inside a multi-document transaction. findOneAndUpdate with upsert is atomic by itself.
   */
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
    { upsert: true, new: true }
  )

  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    // 3. Update User Profile (User-specific, safe in transaction)
    await UserProfile.findOneAndUpdate(
      { user: user?._id },
      {
        $set: {
          currentStation: newCurrentStation,
          futureStation: null,
          estimatedPcsDate: null,
          isArrived: true,
        },
      },
      { session }
    )

    // 4. Archive previous active groups
    await GroupMember.updateMany(
      { user: user?._id, status: MembershipStatus.ACTIVE },
      { $set: { status: MembershipStatus.ARCHIVED, archivedAt: new Date() } },
      { session }
    )

    // 5. Update Group Suggestion (User-specific)
    await GroupSuggestion.findOneAndUpdate(
      { user: user?._id },
      { $set: { group: newCommerGroup?._id } },
      { upsert: true, session }
    )

    await session.commitTransaction()
    return {
      newStation: newCurrentStation,
      suggestedGroup: newCommerGroup,
    }
  } catch (error) {
    await session.abortTransaction()
    console.error('Arrival Transaction Error:', error)
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to mark as arrived!`)
  } finally {
    session.endSession()
  }
}

// 4. Get Groups based on tabs:
const getAllGroups = async (user: IUser, query: TGetUserAllGroupQuery) => {
  const { tab, page, limit, searchTerm, sortBy = 'createdAt', sortOrder = 'desc' } = query

  const dataLimit = Number(limit) || 10
  const dataPage = Number(page) || 1
  const skip = (dataPage - 1) * dataLimit

  // 1. Check is the user profile exists?:
  const profile = await UserProfile.findOne({ user: user?._id })
  if (!profile) {
    throw new AppError(httpStatus.NOT_FOUND, `User profile doesn't exists!`)
  }

  const pipeline: PipelineStage[] = []

  // searchable fields:
  const searchableFields = [
    'groupName',
    'stationName',
    'stationCountry',
    'stationCity',
    'stationState',
    'stationType',
  ]

  if (tab === GroupTabs.SUGGESTED) {
    const suggestedPipeline: PipelineStage[] = [
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
          timeline: '$groupDetails.timeline',
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
          totalMember: {
            $size: '$groupDetails.members',
          },

          isAlreadyJoined: {
            $cond: {
              if: { $in: [new Types.ObjectId(user?._id), '$groupDetails.members.user'] },
              then: true,
              else: false,
            },
          },
          isArchived: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: '$groupDetails.members',
                    as: 'member',
                    cond: {
                      $and: [
                        { $eq: ['$$member.user', new Types.ObjectId(user?._id)] },
                        { $eq: ['$$member.status', MembershipStatus.ARCHIVED] },
                      ],
                    },
                  },
                },
              },
              0,
            ],
          },
          isActiveInGroup: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: '$groupDetails.members',
                    as: 'member',
                    cond: {
                      $and: [
                        { $eq: ['$$member.user', new Types.ObjectId(user?._id)] },
                        { $eq: ['$$member.status', MembershipStatus.ACTIVE] },
                      ],
                    },
                  },
                },
              },
              0,
            ],
          },
        },
      },
    ]

    if (searchTerm) {
      suggestedPipeline.push({
        $match: {
          $or: searchableFields.map((field) => ({
            [field]: {
              $regex: searchTerm,
              $options: 'i',
            },
          })),
        },
      })
    }

    suggestedPipeline.push({
      $sort: {
        [sortBy as string]: sortOrder !== 'desc' ? 1 : -1,
      },
    })

    suggestedPipeline.push({
      $facet: {
        data: [
          {
            $skip: skip,
          },
          {
            $limit: dataLimit,
          },
        ],
        meta: [
          {
            $count: 'total',
          },
        ],
      },
    })

    const groups = await GroupSuggestion.aggregate(suggestedPipeline)
    const data = groups?.[0]?.data
    const total = groups?.[0].meta?.[0]?.total
    const totalPages = Math.ceil(total / dataLimit)

    return {
      data,
      meta: {
        page: dataPage,
        limit: dataLimit,
        total,
        totalPages,
      },
    }
  }

  if ([GroupTabs.ACTIVE, GroupTabs.ARCHIVED].includes(tab as string)) {
    pipeline.push({
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
    })

    pipeline.push({
      $lookup: {
        from: 'dutystations',
        localField: 'station',
        foreignField: '_id',
        as: 'station',
        pipeline: [],
      },
    })

    pipeline.push({
      $unwind: {
        path: '$station',
        preserveNullAndEmptyArrays: true,
      },
    })

    pipeline.push({
      $project: {
        _id: '$_id',
        type: '$type',
        timeline: '$timeline',
        groupName: {
          $concat: ['$station.name', ' - ', '$type', ' - ', '$timeline'],
        },
        stationId: '$station._id',
        stationName: '$station.name',
        stationCity: '$station.city',
        stationType: '$station.type',
        stationState: '$station.state',
        stationCountry: '$station.country',
        createdAt: '$createdAt',
        totalMember: {
          $size: '$members',
        },
        isAlreadyJoined: {
          $cond: {
            if: { $in: [new Types.ObjectId(user?._id), '$members.user'] },
            then: true,
            else: false,
          },
        },
        isArchived: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: '$members',
                  as: 'member',
                  cond: {
                    $and: [
                      { $eq: ['$$member.user', new Types.ObjectId(user?._id)] },
                      { $eq: ['$$member.status', MembershipStatus.ARCHIVED] },
                    ],
                  },
                },
              },
            },
            0,
          ],
        },
        isActiveInGroup: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: '$members',
                  as: 'member',
                  cond: {
                    $and: [
                      { $eq: ['$$member.user', new Types.ObjectId(user?._id)] },
                      { $eq: ['$$member.status', MembershipStatus.ACTIVE] },
                    ],
                  },
                },
              },
            },
            0,
          ],
        },
      },
    })
  }

  if (tab === GroupTabs.ACTIVE) {
    pipeline.push({
      $match: {
        isActiveInGroup: true,
      },
    })
  }

  if (tab === GroupTabs.ARCHIVED) {
    pipeline.push({
      $match: {
        isArchived: true,
      },
    })
  }

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: searchableFields.map((field) => ({
          [field]: {
            $regex: searchTerm,
            $options: 'i',
          },
        })),
      },
    })
  }

  pipeline.push({
    $sort: {
      [sortBy as string]: sortOrder !== 'desc' ? 1 : -1,
    },
  })

  pipeline.push({
    $facet: {
      data: [
        {
          $skip: skip,
        },
        {
          $limit: dataLimit,
        },
      ],
      meta: [
        {
          $count: 'total',
        },
      ],
    },
  })

  const groups = await Group.aggregate(pipeline)
  const data = groups?.[0]?.data
  const total = groups?.[0].meta?.[0]?.total
  const totalPages = Math.ceil(total / dataLimit)

  return {
    data,
    meta: {
      page: dataPage,
      limit: dataLimit,
      total,
      totalPages,
    },
  }
}

// 5. Leave from group
const leaveGroup = async (user: IUser, groupId: string) => {
  //  1. Find the member
  const membership = await GroupMember.findOne({
    user: user?._id,
    group: groupId,
    status: MembershipStatus.ACTIVE,
  })

  if (!membership) {
    throw new AppError(httpStatus.NOT_FOUND, 'You are not an active member of this group.')
  }

  // 2. Update membership status:
  membership.status = MembershipStatus.LEFT
  membership.leavedAt = new Date()
  await membership.save()

  //3. Update Suggestion
  await GroupSuggestion.findOneAndUpdate(
    { user: user?._id, group: groupId },
    { $set: { isDissmiss: true } },
    { upsert: true }
  )

  return { message: 'Successfully left the group.' }
}

export const groupServices = {
  findOrCreateSuggestedGroup,
  joinGroup,
  markAsArrived,
  getAllGroups,
  leaveGroup,
}
