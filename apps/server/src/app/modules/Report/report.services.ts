// 1. Report Post:

import { Report, type IReport, type IUser } from '@repo/db'
import type { TReportPostPayload } from './report.validations'
import { model } from 'mongoose'
import { AppError } from 'packages/shared/src'
import httpStatus from 'http-status'

// 1. Report post:
const reportPost = async (user: IUser, payload: TReportPostPayload) => {
  // 1. destructure :
  const { post: postId, reason, isGroup } = payload

  //  2. Find out the model :
  const modelName = isGroup ? 'GroupPost' : 'CommunityPost'

  //  3. Get the model :
  const Model = model(modelName)

  //  4. Check is post exists?:
  const post = await Model.findById(postId)
  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, `Post doesn't exists!`)
  }

  // 5. have you already reported for same post?:
  const isReportAlready = await Report.findOne({
    post: post?._id,
    reporter: user?._id,
  })

  if (isReportAlready) {
    throw new AppError(httpStatus.BAD_REQUEST, `You have already reported the post!`)
  }

  //  6. prepare payload:
  const newPayload = {
    post: post?._id,
    reporter: user?._id,
    isGroup,
    postModel: modelName,
    reason,
  }

  //  7. Save the data :
  const report = await Report.create(newPayload)
  return report
}

// 2. Report Get all the posts:
export const reportServices = {
  reportPost,

}




