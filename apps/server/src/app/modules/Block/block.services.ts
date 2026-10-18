import {
  AuthRoles,
  BlockedUser,
  Conversation,
  User,
  Wave,
  type IUser,
} from '@repo/db'
import { AppError } from '@repo/shared'
import httpStatus from 'http-status'
import { Types } from 'mongoose'
import type { TGetMyBlockedUsersQuery } from './block.validations'

/**
 * 1. Block a user (User to User only)
 */
const blockUser = async (
  currentUser: IUser,
  targetUserId: string,
  reason?: string
) => {
  if (currentUser._id.toString() === targetUserId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You cannot block yourself!')
  }

  if (!Types.ObjectId.isValid(targetUserId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid user ID!')
  }

  // 1. Check if target user exists
  const targetUser = await User.findById(targetUserId)
  if (!targetUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!')
  }

  // 2. Only USER to USER blocking is permitted
  if (
    targetUser.role === AuthRoles.ADMIN ||
    targetUser.role === AuthRoles.SUPER_ADMIN
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You cannot block an administrator!'
    )
  }

  // 3. Upsert Block Record
  await BlockedUser.findOneAndUpdate(
    {
      blocker: currentUser._id,
      blocked: targetUser._id,
    },
    {
      $set: {
        blocker: currentUser._id,
        blocked: targetUser._id,
        ...(reason ? { reason } : {}),
      },
    },
    { upsert: true, new: true }
  )

  // 4. Side Effects & Cleanups:
  // a. Remove any pending/accepted waves between them
  await Wave.deleteMany({
    $or: [
      { sender: currentUser._id, receiver: targetUser._id },
      { sender: targetUser._id, receiver: currentUser._id },
    ],
  })

  // b. Deactivate any existing direct conversation between them
  await Conversation.updateMany(
    {
      participant: {
        $all: [currentUser._id, targetUser._id],
      },
    },
    {
      $set: { isActive: false },
    }
  )

  return { message: 'User blocked successfully' }
}

/**
 * 2. Unblock a user
 */
const unblockUser = async (currentUser: IUser, targetUserId: string) => {
  if (!Types.ObjectId.isValid(targetUserId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid user ID!')
  }

  const deleted = await BlockedUser.findOneAndDelete({
    blocker: currentUser._id,
    blocked: new Types.ObjectId(targetUserId),
  })

  if (!deleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'User is not blocked!')
  }

  return { message: 'User unblocked successfully' }
}

/**
 * 3. Get all users blocked by the current user
 */
const getMyBlockedUsers = async (
  currentUser: IUser,
  query: TGetMyBlockedUsersQuery
) => {
  const { page = 1, limit = 10, searchTerm } = query
  const dataPage = Number(page) || 1
  const dataLimit = Number(limit) || 10
  const skip = (dataPage - 1) * dataLimit

  const filter: Record<string, unknown> = {
    blocker: currentUser._id,
  }

  const [total, blockedRecords] = await Promise.all([
    BlockedUser.countDocuments(filter),
    BlockedUser.find(filter)
      .populate({
        path: 'blocked',
        select: 'name email profileImage role status',
        match: searchTerm
          ? {
              $or: [
                { name: { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } },
              ],
            }
          : undefined,
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(dataLimit),
  ])

  // Filter out any populated nulls (if search matched nothing or user was deleted)
  const data = blockedRecords
    .filter((record) => record.blocked !== null && record.blocked !== undefined)
    .map((record) => ({
      _id: record._id,
      user: record.blocked,
      reason: record.reason,
      createdAt: record.createdAt,
    }))

  return {
    data,
    meta: {
      page: dataPage,
      limit: dataLimit,
      total,
      totalPages: Math.ceil(total / dataLimit),
    },
  }
}

/**
 * 4. Helper: Get all user IDs mutually blocked with a given user
 * (Both users blocked by this user AND users who blocked this user)
 */
const getBlockedUserIds = async (
  userId: Types.ObjectId | string
): Promise<Types.ObjectId[]> => {
  if (!userId) return []
  const uid = new Types.ObjectId(userId)

  const records = await BlockedUser.find({
    $or: [{ blocker: uid }, { blocked: uid }],
  }).select('blocker blocked')

  const idSet = new Set<string>()
  for (const rec of records) {
    const blockerStr = rec.blocker.toString()
    const blockedStr = rec.blocked.toString()
    if (blockerStr !== uid.toString()) {
      idSet.add(blockerStr)
    }
    if (blockedStr !== uid.toString()) {
      idSet.add(blockedStr)
    }
  }

  return Array.from(idSet).map((id) => new Types.ObjectId(id))
}

/**
 * 5. Helper: Check if two users have a mutual block relationship
 */
const isMutualBlocked = async (
  userAId: Types.ObjectId | string,
  userBId: Types.ObjectId | string
): Promise<boolean> => {
  if (!userAId || !userBId) return false
  const a = new Types.ObjectId(userAId)
  const b = new Types.ObjectId(userBId)

  const exists = await BlockedUser.exists({
    $or: [
      { blocker: a, blocked: b },
      { blocker: b, blocked: a },
    ],
  })

  return exists !== null
}

export const BlockServices = {
  blockUser,
  unblockUser,
  getMyBlockedUsers,
  getBlockedUserIds,
  isMutualBlocked,
}
