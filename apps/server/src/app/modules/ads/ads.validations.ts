import { optionalDate, optionalNumber, optionalString, requiredString } from 'packages/shared/src'
import z from 'zod'

// Create Ads:
const createAds = z.object({
  body: z.object({
    url: requiredString('URL'),
  }),
})

// Get My Ads:
const getMyAds = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search Term'),
    sortBy: optionalString('Sort By'),
    sortOrder: optionalString('Sort Order'),
    fromDate: optionalDate('From Date'),
    toDate: optionalDate('To Date'),
  }),
})

// Get Premium Ads:
const getAllAds = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search Term'),
    sortBy: optionalString('Sort By'),
    sortOrder: optionalString('Sort Order'),
    fromDate: optionalDate('From Date'),
    toDate: optionalDate('To Date'),
  }),
})

// Delete Ads:
const deleteAds = z.object({
  params: z.object({
    id: z.string().min(1, 'ID is required'),
  }),
})

export const AdsValidations = {
  createAds,
  getMyAds,
  getAllAds,
  deleteAds,
}

export type TCreateAdsPayload = z.infer<typeof createAds>['body']
export type TGetMyAdsQuery = z.infer<typeof getMyAds>['query']
export type TGetAllAdsQuery = z.infer<typeof getAllAds>['query']
export type TDeleteAdsParams = z.infer<typeof deleteAds>['params']
