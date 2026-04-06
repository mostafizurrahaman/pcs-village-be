import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { FaqServices } from './faq.services'

const createFaq = catchAsync(async (req, res) => {
  const result = await FaqServices.createFaq(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'FAQ created successfully!',
    data: result,
  })
})

const getAllFaq = catchAsync(async (req, res) => {
  const result = await FaqServices.getAllFaq(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'FAQs retrieved successfully!',
    meta: result.meta,
    data: result.result,
  })
})

const getSingleFaq = catchAsync(async (req, res) => {
  const result = await FaqServices.getSingleFaq(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'FAQ retrieved successfully!',
    data: result,
  })
})

const updateFaq = catchAsync(async (req, res) => {
  const result = await FaqServices.updateFaq(req.params.id as string, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'FAQ updated successfully!',
    data: result,
  })
})

const deleteFaq = catchAsync(async (req, res) => {
  await FaqServices.deleteFaq(req.params.id as string) 

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'FAQ deleted successfully!',
    data: null,
  })
})

export const FaqController = {
  createFaq,
  getAllFaq,
  getSingleFaq,
  updateFaq,
  deleteFaq,
}
