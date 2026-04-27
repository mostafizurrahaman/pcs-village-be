import moment from 'moment'
import mongoose, { Types, type PipelineStage } from 'mongoose'
import {
  AuthRoles,
  BaseRequest,
  CommunityComment,
  CommunityPost,
  Conversation,
  Group,
  GroupMember,
  GroupPost,
  GroupPostComment,
  GroupPostLike,
  GroupSuggestion,
  Message,
  Notification,
  Otp,
  PostLike,
  Report,
  User,
  UserProfile,
  Wave,
} from 'packages/db/src'
import type { IGetAllUserQueryType, IGetDashboardStatsQueryType } from './user.validations'
import { AppError } from '@repo/shared'
import { deleteMultipleFilesFromS3 } from '@repo/media-hub'
import httpStatus from 'http-status'

const getAllUserFromDB = async (query: IGetAllUserQueryType) => {
  const {
    page = 1,
    limit = 10,
    searchTerm,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    fromDate,
    toDate,
    status,
    role,
  } = query

  const pipeline: PipelineStage[] = []

  // 1. Initial Match (Search & Date Filters on User Model)
  const matchQuery: any = {}

  if (searchTerm) {
    matchQuery.$or = [
      { name: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
    ]
  }

  if (status) matchQuery.status = status
  if (role) matchQuery.role = role

  if (fromDate || toDate) {
    matchQuery.createdAt = {}
    if (fromDate) matchQuery.createdAt.$gte = new Date(fromDate)
    if (toDate) matchQuery.createdAt.$lte = new Date(toDate)
  }

  if (Object.keys(matchQuery).length > 0) {
    pipeline.push({ $match: matchQuery })
  }

  // 2. Lookup Profile and Nested Stations/Branches
  pipeline.push({
    $lookup: {
      from: 'userprofiles',
      localField: '_id',
      foreignField: 'user',
      pipeline: [
        {
          $lookup: {
            from: 'dutystations',
            localField: 'currentStation',
            foreignField: '_id',
            as: 'currentStationDetails',
          },
        },
        {
          $lookup: {
            from: 'dutystations',
            localField: 'futureStation',
            foreignField: '_id',
            as: 'futureStationDetails',
          },
        },
        {
          $lookup: {
            from: 'branches',
            localField: 'branch',
            foreignField: '_id',
            as: 'branchDetails',
          },
        },
        { $unwind: { path: '$futureStationDetails', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$currentStationDetails', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$branchDetails', preserveNullAndEmptyArrays: true } },
      ],
      as: 'profile',
    },
  })

  pipeline.push({
    $unwind: { path: '$profile', preserveNullAndEmptyArrays: true },
  })

  // 3. Sorting
  const sortDirection = sortOrder === 'desc' ? -1 : 1
  pipeline.push({
    $sort: { [sortBy]: sortDirection },
  })

  // 4. Projection
  pipeline.push({
    $project: {
      _id: 1,
      name: 1,
      email: 1,
      status: 1,
      role: 1,
      isTwoFactorEnabled: 1,
      profileImage: 1,
      createdAt: 1,
      branchName: '$profile.branchDetails.name',
      branchId: '$profile.branchDetails._id',
      affiliation: '$profile.affiliation',
      interestTags: '$profile.interestTags',
      kidsAgeRanges: '$profile.kidsAgeRanges',
      estimatedPcsDate: '$profile.estimatedPcsDate',
      futureStationName: '$profile.futureStationDetails.name',
      futureStationId: '$profile.futureStationDetails._id',
      currentStationName: '$profile.currentStationDetails.name',
      currentStationId: '$profile.currentStationDetails._id',
    },
  })

  // 5. Facet for Pagination (Meta data + Data in one query)
  pipeline.push({
    $facet: {
      meta: [{ $count: 'total' }],
      data: [{ $skip: (Number(page) - 1) * Number(limit) }, { $limit: Number(limit) }],
    },
  })

  const result = await User.aggregate(pipeline)

  const total = result[0]?.meta[0]?.total || 0
  const data = result[0]?.data || []

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
    data,
  }
}

const getSingleUserFromDB = async (id: string) => {
  // Convert string ID to MongoDB ObjectId
  const userId = new Types.ObjectId(id)

  const pipeline: PipelineStage[] = [
    // 1. Find the specific user first
    { $match: { _id: userId } },

    // 2. Lookup Profile and Nested details
    {
      $lookup: {
        from: 'userprofiles',
        localField: '_id',
        foreignField: 'user',
        pipeline: [
          {
            $lookup: {
              from: 'dutystations',
              localField: 'currentStation',
              foreignField: '_id',
              as: 'currentStationDetails',
            },
          },
          {
            $lookup: {
              from: 'dutystations',
              localField: 'futureStation',
              foreignField: '_id',
              as: 'futureStationDetails',
            },
          },
          {
            $lookup: {
              from: 'branches',
              localField: 'branch',
              foreignField: '_id',
              as: 'branchDetails',
            },
          },
          { $unwind: { path: '$futureStationDetails', preserveNullAndEmptyArrays: true } },
          { $unwind: { path: '$currentStationDetails', preserveNullAndEmptyArrays: true } },
          { $unwind: { path: '$branchDetails', preserveNullAndEmptyArrays: true } },
        ],
        as: 'profile',
      },
    },

    // 3. Unwind the profile array
    { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },

    // 4. Project clean output
    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        status: 1,
        role: 1,
        isTwoFactorEnabled: 1,
        profileImage: 1,
        createdAt: 1,
        branchName: '$profile.branchDetails.name',
        branchId: '$profile.branchDetails._id',
        affiliation: '$profile.affiliation',
        interestTags: '$profile.interestTags',
        kidsAgeRanges: '$profile.kidsAgeRanges',
        estimatedPcsDate: '$profile.estimatedPcsDate',
        futureStationName: '$profile.futureStationDetails.name',
        futureStationId: '$profile.futureStationDetails._id',
        currentStationName: '$profile.currentStationDetails.name',
        currentStationId: '$profile.currentStationDetails._id',
      },
    },
  ]

  const result = await User.aggregate(pipeline)

  // Since aggregate returns an array, return the first element or null
  return result.length > 0 ? result[0] : null
}

const deleteUserPermanently = async (requestor: any, targetUserId: string) => {
  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    const userId = new mongoose.Types.ObjectId(targetUserId)

    // 1. Fetch user & check permissions
    const targetUser = await User.findById(userId).session(session)
    if (!targetUser) throw new AppError(httpStatus.NOT_FOUND, 'User not found!')

    const isSelfDelete = requestor._id.toString() === targetUserId
    if (
      isSelfDelete &&
      (targetUser.role === AuthRoles.ADMIN || targetUser.role === AuthRoles.SUPER_ADMIN)
    ) {
      throw new AppError(httpStatus.FORBIDDEN, 'Admins cannot self-delete via this API.')
    }

    // 2. COLLECT S3 FILE URLS FOR CLEANUP (Posts, Comments, Profile)
    const fileUrls: string[] = []
    if (targetUser.profileImage) fileUrls.push(targetUser.profileImage)

    // Get attachments from user's public and group activities
    const [cPosts, gPosts, cComments, gComments, userMessages] = await Promise.all([
      CommunityPost.find({ author: userId }, { attachments: 1 }).session(session),
      GroupPost.find({ author: userId }, { attachments: 1 }).session(session),
      CommunityComment.find({ author: userId }, { attachments: 1 }).session(session),
      GroupPostComment.find({ author: userId }, { attachments: 1 }).session(session),
      Message.find({ sender: userId }, { attachments: 1 }).session(session), // Collect chat media
    ])

    ;[...cPosts, ...gPosts, ...cComments, ...gComments, ...userMessages].forEach((doc) => {
      if (doc.attachments && doc.attachments.length > 0) {
        fileUrls.push(...(doc.attachments as string[]))
      }
    })

    // 3. IDENTIFY CONVERSATIONS TO WIPE
    // Find all conversations where the user was a participant
    const userConversations = await Conversation.find({
      participant: userId,
    })
      .select('_id')
      .session(session)

    const conversationIds = userConversations.map((c) => c._id)

    // 4. DATABASE DELETION (The "Nuke" Phase)
    await Promise.all([
      // Profile & Identity
      User.findByIdAndDelete(userId).session(session),
      UserProfile.deleteOne({ user: userId }).session(session),
      Otp.deleteMany({ user: userId }).session(session),

      // Chat Wipe (Messages first, then Conversations)
      Message.deleteMany({ conversation: { $in: conversationIds } }).session(session),
      Conversation.deleteMany({ _id: { $in: conversationIds } }).session(session),

      // Social & Community
      CommunityPost.deleteMany({ author: userId }).session(session),
      CommunityComment.deleteMany({ author: userId }).session(session),
      PostLike.deleteMany({ user: userId }).session(session),

      // Groups
      GroupMember.deleteMany({ user: userId }).session(session),
      GroupSuggestion.deleteMany({ user: userId }).session(session),
      GroupPost.deleteMany({ author: userId }).session(session),
      GroupPostComment.deleteMany({ author: userId }).session(session),
      GroupPostLike.deleteMany({ user: userId }).session(session),

      // Connections & Notifications
      Wave.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] }).session(session),
      Notification.deleteMany({ $or: [{ receiver: userId }, { sender: userId }] }).session(session),

      // Admin related
      BaseRequest.deleteMany({ requesterId: userId }).session(session),
      Report.deleteMany({ reporter: userId }).session(session),
    ])

    // 5. COMMIT DATABASE CHANGES
    await session.commitTransaction()
    session.endSession()

    // 6. CLOUD CLEANUP (Physical File Deletion)
    if (fileUrls.length > 0) {
      const uniqueUrls = [...new Set(fileUrls)]
      // Using uniqueUrls to avoid trying to delete the same file twice
      await deleteMultipleFilesFromS3(uniqueUrls)
    }

    return {
      success: true,
      message: 'User account and all related data (including chats) have been permanently deleted.',
    }
  } catch (error: any) {
    await session.abortTransaction()
    session.endSession()
    throw new AppError(error.statusCode || 500, error.message || 'Failed to wipe user data')
  }
}

const getDashboardStats = async (query: IGetDashboardStatsQueryType) => {
  const { year, weekType } = query
  const startDate = moment().year(year).startOf('year').toDate()
  const endDate = moment().year(year).endOf('year').toDate()

  // --- 1. TOP 6 CARDS (Filterable by Year) ---
  const [
    totalUsers,
    activeUsers,
    communityPosts,
    groupPosts,
    totalGroups,
    totalMessages,
    totalConversations,
  ] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
    User.countDocuments({ status: 'active', createdAt: { $gte: startDate, $lte: endDate } }),
    CommunityPost.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
    GroupPost.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
    Group.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
    Message.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
    Conversation.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
  ])

  // --- 2. USER GROWTH (Line Chart - Monthly) ---
  const growthData = await User.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: { $month: '$createdAt' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ])

  // Format Growth Data to ensure all 12 months are present
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const formattedGrowth = months.map((month, index) => {
    const found = growthData.find((d) => d._id === index + 1)
    return { month, count: found ? found.count : 0 }
  })

  // --- 3. DAILY ACTIVE USERS (Bar Chart - Mon to Sun) ---
  const startOfWeek =
    weekType === 'this-week'
      ? moment().startOf('isoWeek')
      : moment().subtract(1, 'weeks').startOf('isoWeek')

  const endOfWeek = moment(startOfWeek).endOf('isoWeek')

  const dailyActiveData = await User.aggregate([
    {
      $match: {
        updatedAt: { $gte: startOfWeek.toDate(), $lte: endOfWeek.toDate() },
        status: 'active',
      },
    },
    {
      $group: {
        _id: { $dayOfWeek: '$updatedAt' }, // 1 (Sun) to 7 (Sat)
        count: { $sum: 1 },
      },
    },
  ])

  // Format Daily Active Data (Adjusting Mongo's 1=Sun to Mon-Sun sequence)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const formattedDAU = days.map((day, index) => {
    // Mongo dayOfWeek: 1=Sun, 2=Mon... 7=Sat. Mapping index: 0=Mon (2), 6=Sun (1)
    const mongoDay = index === 6 ? 1 : index + 2
    const found = dailyActiveData.find((d) => d._id === mongoDay)
    return { day, count: found ? found.count : 0 }
  })

  return {
    cards: {
      totalUsers,
      activeUsers,
      totalPosts: communityPosts + groupPosts,
      totalGroups,
      messagesSent: totalMessages,
      totalConversations,
    },
    userGrowth: formattedGrowth,
    dailyActiveUsers: formattedDAU,
  }
}

export const userServices = {
  getAllUserFromDB,
  getSingleUserFromDB,
  deleteUserPermanently,
  getDashboardStats,
}
