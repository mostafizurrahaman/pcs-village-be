import {
  GroupMember,
  GroupPost,
  GroupPostLike,
  MembershipStatus,
  type IUser,
} from 'packages/db/src'
import { AppError } from 'packages/shared/src'
import httpStatus from 'http-status'
import type { Types } from 'mongoose'
import { notificationServices } from '../Notification/notification.services'

const toggleLike = async (user: IUser, postId: string) => {
  // 1. Check if the post exists
  const postExists = await GroupPost.findOne({ _id: postId })

  if (!postExists) {
    throw new AppError(httpStatus.NOT_FOUND, `Post doesn't exist!`)
  }

  // 2. check membership:
  const membership = await GroupMember.findOne({
    user: user?._id,
    group: postExists.group,
    status: MembershipStatus.ACTIVE,
  })
  if (!membership) {
    throw new AppError(httpStatus.BAD_REQUEST, `You don't have active membership into this group!`)
  }

  // 3. Try to find and REMOVE the like (Toggle Off)
  const deletedLike = await GroupPostLike.findOneAndDelete({
    user: user?._id,
    post: postId,
  })

  if (deletedLike) {
    return {
      like: false,
      message: 'removed',
    }
  }

  // 3. If no like was deleted, CREATE one (Toggle On)
  await GroupPostLike.create({
    user: user?._id,
    post: postId,
  })

  if (user?._id?.toString() !== postExists.author?.toString()) {
    await notificationServices.createAndSendNotification(
      {
        receiver: postExists?.author as Types.ObjectId,
        sender: user?._id,
        type: 'GROUP_POST_LIKE',
        title: 'New Like!',
        message: `${user.name} liked your post!`,
        entityId: postExists._id,
        entityModel: 'GroupPost',
      },
      null
    )
  }
  return {
    like: true,
    message: 'added',
  }
}

export const postLikeServices = {
  toggleLike,
}
