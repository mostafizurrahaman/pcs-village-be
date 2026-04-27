import { Ads, type IUser } from 'packages/db/src'
import type { TCreateAdsPayload, TGetMyAdsQuery } from './ads.validations'
import type { PipelineStage } from 'mongoose'
import { AppError } from 'packages/shared/src'
import httpStatus from 'http-status'
import { uploadSingleFileToS3 } from 'packages/media-hub/src'
import { backup } from 'node:sqlite'

// 1. Create Ads:
const createAds = async (user: IUser, adData: TCreateAdsPayload, file: Express.Multer.File) => {
  const { url } = adData

  if (!file) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Banner image is required')
  }

  const { url: bannerUrl } = await uploadSingleFileToS3(file, 'ads') // Implement this function to upload file to S3 and return the URL

  const newAd = await Ads.create({
    user: user._id,
    url,
    banner: bannerUrl,
  })

  return newAd
}

// 2. Get My Ads:
const getMyAds = async (user: IUser, query: TGetMyAdsQuery) => {
  const { page = 1, limit = 10, searchTerm, sortBy, sortOrder, fromDate, toDate } = query

  const pipeline: PipelineStage[] = []

  //   1. Match ads by user:
  pipeline.push({ $match: { user: user._id } })

  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'user',
      foreignField: '_id',
      as: 'userDetails',
    },
  })

  pipeline.push({ $unwind: '$userDetails' })

  pipeline.push({
    $project: {
      name: '$userDetails.name',
      email: '$userDetails.email',
      url: '$url',
      banner: '$banner',
      createdAt: '$createdAt',
      updatedAt: '$updatedAt',
    },
  })

  //   3. Apply date filter:
  if (fromDate || toDate) {
    const dateFilter: Record<string, any> = {}
    if (fromDate) {
      dateFilter.$gte = new Date(fromDate)
    }
    if (toDate) {
      dateFilter.$lte = new Date(toDate)
    }
    pipeline.push({ $match: { createdAt: dateFilter } })
  }

  //   4. Apply search filter:
  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: [
          { url: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
        ],
      },
    })
  }

  //   5. Apply sorting:
  if (sortBy) {
    const sortStage: Record<string, any> = {}
    sortStage[sortBy] = sortOrder === 'desc' ? -1 : 1
    pipeline.push({ $sort: sortStage })
  }

  //   6. Apply pagination:
  const dataPage = Number(page)
  const dataLimit = Number(limit)
  const skip = (dataPage - 1) * dataLimit

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: dataLimit }],
      totalCount: [{ $count: 'count' }],
    },
  })

  const ads = await Ads.aggregate(pipeline)

  const data = ads[0]?.data || []
  const totalCount = ads[0]?.totalCount[0]?.count || 0
  const totalPages = Math.ceil(totalCount / dataLimit) || 0

  return {
    data,
    meta: {
      page: dataPage,
      limit: dataLimit,
      total: totalCount,
      totalPages,
    },
  }
}

export const adsServices = {
  createAds,
  getMyAds,
}
