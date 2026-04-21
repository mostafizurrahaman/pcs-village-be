import { catchAsync, sendResponse } from '@repo/shared'
import type { TGetAllConversationQueryType } from './conversation.validations'
import { getUserFromRequest } from '@app/libs/get-user-from-requests'
import httpStatus from 'http-status'

import { conversationServices } from './conversation.services'

const getAllConversations = catchAsync(async (req, res) => {
  const query = req.query as TGetAllConversationQueryType
  const user = await getUserFromRequest(req)

  const result = await conversationServices.getAllConversations(user, query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'All conversation retreived successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getAllMessageForConversation = catchAsync(async (req, res) => {
  const query = req.query as TGetAllConversationQueryType
  const user = await getUserFromRequest(req)

  const result = await conversationServices.getAllMessage(user, query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'All conversation retreived successfully!',
    data: result.data,
    meta: result.meta,
  })
})

export const conversationController = {
  getAllConversations,
  getAllMessageForConversation,
}
