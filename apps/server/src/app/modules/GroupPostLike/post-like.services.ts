import {
  GroupMember,
  GroupPost,
  GroupPostLike,
  MembershipStatus,
  type IUser,
} from 'packages/db/src'
import { AppError } from 'packages/shared/src'
import httpStatus from 'http-status'

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

  return {
    like: true,
    message: 'added',
  }
}

export const postLikeServices = {
  toggleLike,
}
