import { Faq } from 'packages/db/src'
import { QueryBuilder } from '@repo/shared'
import type { ICreateFaqPayload, IGetAllFaqQueryType, IUpdateFaqPayload } from './faq.validations'

const createFaq = async (payload: ICreateFaqPayload) => {
  const result = await Faq.create(payload)
  return result
}

const getAllFaq = async (query: IGetAllFaqQueryType) => {
  const { fromDate, toDate, ...filterQuery } = query

  // Date filter
  const dateFilter: Record<string, Date> = {}
  if (fromDate) {
    dateFilter.$gte = new Date(fromDate)
  }
  if (toDate) {
    dateFilter.$lte = new Date(toDate)
  }

  // Base filter object
  const baseFilter: Record<string, unknown> = {}

  // Apply date filter if exists
  if (Object.keys(dateFilter).length > 0) {
    baseFilter.createdAt = dateFilter
  }

  const faqQuery = new QueryBuilder(Faq.find(baseFilter), filterQuery)
    .search(['question', 'answer'])
    .filter()
    .sort()
    .paginate()
    .fields()

  const result = await faqQuery.modelQuery
  const meta = await faqQuery.countTotal()

  return {
    meta,
    result,
  }
}

const getSingleFaq = async (id: string) => {
  return await Faq.findById(id)
}

const updateFaq = async (id: string, payload: IUpdateFaqPayload) => {
  return await Faq.findByIdAndUpdate(id, { $set: payload }, { new: true })
}

const deleteFaq = async (id: string) => {
  return await Faq.findByIdAndDelete(id)
}

export const FaqServices = {
  createFaq,
  getAllFaq,
  getSingleFaq,
  updateFaq,
  deleteFaq,
}
