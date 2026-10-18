import { CommunityPost, PostLike, type IUser } from 'packages/db/src'
import { AppError } from 'packages/shared/src'
import httpStatus from 'http-status'
import { notificationServices } from '../Notification/notification.services'
import type { Types } from 'mongoose'
import { postLikeValidation } from './post-like.validation'
import { BlockServices } from '../Block/block.services'

const toggleLike = async (user: IUser, postId: string) => {
  // 1. Check if the post exists
  const postExists = await CommunityPost.findById(postId)

  if (!postExists) {
    throw new AppError(httpStatus.NOT_FOUND, `Post doesn't exist!`)
  }

  // Check if post author is mutually blocked
  if (postExists.author) {
    const isBlocked = await BlockServices.isMutualBlocked(user._id, postExists.author)
    if (isBlocked) {
      throw new AppError(httpStatus.FORBIDDEN, `Cannot interact with this post!`)
    }
  }

  // 2. Try to find and REMOVE the like (Toggle Off)
  const deletedLike = await PostLike.findOneAndDelete({
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
  await PostLike.create({
    user: user?._id,
    post: postId,
  })

  if (user?._id?.toString() !== postExists.author?.toString()) {
    await notificationServices.createAndSendNotification(
      {
        receiver: postExists?.author as Types.ObjectId,
        sender: user?._id,
        type: 'POST_LIKE',
        title: 'New Like!',
        message: `${user.name} liked your post!`,
        entityId: postExists._id,
        entityModel: 'CommunityPost',
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
