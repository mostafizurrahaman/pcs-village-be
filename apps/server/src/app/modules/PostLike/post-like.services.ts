import { CommunityPost, PostLike, type IUser } from 'packages/db/src'
import { AppError } from 'packages/shared/src'
import httpStatus from 'http-status'

const toggleLike = async (user: IUser, postId: string) => {
  // 1. Check if the post exists
  const postExists = await CommunityPost.exists({ _id: postId })

  if (!postExists) {
    throw new AppError(httpStatus.NOT_FOUND, `Post doesn't exist!`)
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

  return {
    like: true,
    message: 'added',
  }
}

export const postLikeServices = {
  toggleLike,
}
