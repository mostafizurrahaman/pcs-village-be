import { getUserFromRequest } from '@app/libs/get-user-from-requests'
import { catchAsync, sendResponse } from 'packages/shared/src'
import { adsServices } from './ads.services'

const createAds = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const file = req.file as Express.Multer.File
  const adData = req.body

  const newAd = await adsServices.createAds(user, adData, file)

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Ad created successfully',
    data: newAd,
  })
})

const getMyAds = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const query = req.query

  const adsData = await adsServices.getMyAds(user, query)
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Ads retrieved successfully',
    data: adsData.data,
    meta: adsData.meta,
  })
})

const getAllAds = catchAsync(async (req, res) => {
  const query = req.query

  const adsData = await adsServices.getAllAds(query)
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All Ads retrieved successfully',
    data: adsData.data,
    meta: adsData.meta,
  })
})

const deleteAds = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const id = req.params.id as string

  const ad = await adsServices.deleteAds(user, id)

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Ads delelted successfully',
    data: ad,
  })
})

export const adsControllers = {
  createAds,
  getMyAds,
  getAllAds,
  deleteAds,
}
