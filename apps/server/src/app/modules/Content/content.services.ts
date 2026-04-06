import { Content } from 'packages/db/src'
import type { IContentPayload } from './content.validations'

const updateOrCreateContent = async (payload: IContentPayload) => {
  const result = await Content.findOneAndUpdate(
    {},
    {
      $set: payload,
    },
    {
      new: true,
      upsert: true,
    }
  )

  return result
}

const getContent = async () => {
  const content = await Content.findOne({})

  return content
}

export const ContentServices = {
  updateOrCreateContent,
  getContent,
}
