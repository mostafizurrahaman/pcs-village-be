/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import { Socket, type Server } from 'socket.io'
import {
  AuthStatus,
  Conversation,
  Message,
  User,
  type IMessageDoc,
  type IUser,
} from 'packages/db/src'
import { AppError, verifyToken, type IJwtUserPayload } from 'packages/shared/src'
import httpStatus from 'http-status'
import configs from '@app/configs'
import { logger } from './logger'
import type { Types } from 'mongoose'

// 1. Server to client events types:
interface IServerToClientEvents {
  message_received: (_message: IMessageDoc) => void
  display_typing: (_data: { userId: string; isTyping: boolean }) => void
  socket_error: (_data: { message: string }) => void
  marked_as_read: (_data: { conversationId: string; readBy: string }) => void
}

// 2. Client to server eventsn types:

interface IClientToServerEvents {
  join_room: (_conversationId: string) => void
  send_message: (_data: { conversationId: string; message: string; attachments: string[] }) => void
  typing: (_data: { conversationId: string; isTyping: boolean }) => void
  mark_read: (_conversationId: string) => void
}

type InterServerEvents = Record<string, never>
interface SocketData {
  user: IUser
}

export type TChatServer = Server<
  IClientToServerEvents,
  IServerToClientEvents,
  InterServerEvents,
  SocketData
>
type TChatSocket = Socket<
  IClientToServerEvents,
  IServerToClientEvents,
  InterServerEvents,
  SocketData
>

export const setupChatServer = async (io: TChatServer) => {
  // 1. Socket Middleware:
  io.use(async (socket, next) => {
    try {
      // 1. Check headers for authorization token:
      const token = (socket.handshake.auth.token ||
        socket.handshake.headers.token ||
        socket.handshake.query.token) as string | undefined

      if (!token)
        return next(new AppError(httpStatus.UNAUTHORIZED, 'Authentication token is required!'))

      // 2. Decode the token:
      const decode = (await verifyToken(token, configs.jwt.accessToken.secret)) as IJwtUserPayload
      if (!decode.email) {
        return next(new AppError(httpStatus.UNAUTHORIZED, `You are unauthorized!`))
      }

      // 3. Now Retrived the user:
      const user = await User.isUserExistByEmail(decode.email)
      if (!user) {
        return next(new AppError(httpStatus.UNAUTHORIZED, `User doesn't exists!`))
      }

      // 4. Check is user blocked?:
      if (await User.isUserBlocked(user)) {
        return next(new AppError(httpStatus.FORBIDDEN, 'Your account has been blocked'))
      }

      // 5. Check is user deleted?:
      if (await User.isUserDeleted(user)) {
        return next(new AppError(httpStatus.GONE, 'Your account has been deleted'))
      }
      // 6. Check is user isOtpVerified
      if (!user.isOtpVerified) {
        return next(new AppError(httpStatus.FORBIDDEN, 'Please verify your account'))
      }

      // 7. Check is user status underReview
      if (await User.isUserUnderReview(user)) {
        return next(
          new AppError(
            httpStatus.FORBIDDEN,
            'Your account is under review. Please submit required documents'
          )
        )
      }

      if (user.status !== AuthStatus.ACTIVE) {
        return next(new AppError(httpStatus.FORBIDDEN, 'Your account is not active'))
      }

      // 8. Check is token valid ? :
      if (
        user.passwordChangedAt &&
        (await User.isJwtIssuedBeforePasswordChanged(user.passwordChangedAt, decode?.iat as number))
      ) {
        return next(new AppError(httpStatus.UNAUTHORIZED, 'Token has expired. Please log in again'))
      }

      // 4. set user into socket data:
      socket.data.user = user

      next()
    } catch (err: unknown) {
      next(new AppError(httpStatus.UNAUTHORIZED, `You are unauthorized!`))
    }
  })

  // 2. Connect io:

  io.on('connection', (socket: TChatSocket) => {
    logger.info('=============INSIDE SOCKET===========')
    //  1. Get the user from socket data:
    const user = socket.data.user
    logger.info('user', user.toObject())

    //  2. Join room event:
    socket.on('join_room', async ({ conversationId }: any) => {
      logger.info('conversationId', { conversationId })
      // 1. Check is the conversation exists?
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participant: {
          $in: [user?._id],
        },
      })

      if (!conversation) {
        logger.info('NO CONVERSATION', { conversation })
        socket.emit('socket_error', {
          message: `Conversation doesn't exists!`,
        })
      }

      logger.info('Conversation', conversation?.toObject())

      // 2. Join in conversation room:
      void socket.join(conversation?._id?.toString() as string)
      logger.info(`${user?.name} joined into Conversation: => ${conversation?._id}`)
    })

    // 3.  Send Message event:
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, message, attachments } = data
        logger.info('SEND Message', { conversationId })
        // 1. Check is the conversation exists?
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participant: {
            $in: [user?._id],
          },
        })

        if (!conversation) {
          socket.emit('socket_error', {
            message: `Conversation doesn't exists!`,
          })
        }

        // 2. Post the message:
        const newMessage = await Message.create({
          conversation: conversation?._id as Types.ObjectId,
          sender: user?._id,
          message: message,
          attachments: Array.isArray(attachments) && attachments?.length > 0 ? attachments : [],
        })

        // 3. Update the last message:
        await Conversation.findOneAndUpdate(
          {
            _id: conversation?._id as Types.ObjectId,
          },
          {
            $set: {
              lastMessage: newMessage?._id,
            },
          },
          {
            new: true,
          }
        )

        // 3. Stream to conversation
        io.to(conversation?._id?.toString() as string).emit(
          'message_received',
          newMessage?.toObject()
        )
      } catch (error: any) {
        logger.info('Send Message Error', error)
        socket.emit('socket_error', {
          message: error?.message || `Failed to send message`,
        })
      }
    })

    // 4. Typing Event:
    socket.on('typing', async ({ conversationId }: any) => {
      logger.info('Typing', conversationId)
      // 1. Check is the conversation exists?
      const conversation = await Conversation.findById(conversationId)

      if (!conversation) {
        socket.emit('socket_error', {
          message: `Conversation doesn't exists!`,
        })
      }

      // 2. send disply typing event:
      socket
        .to(conversation?._id?.toString() as string)
        .emit('display_typing', { isTyping: true, userId: user?._id?.toString() })
    })

    // 5. mark as read :
    socket.on('mark_read', async ({ conversationId }: any) => {
      logger.info('Mark As  Read', conversationId)
      // 1. Check is the conversation exists?
      const conversation = await Conversation.findOneAndUpdate({
        _id: conversationId,
      })

      if (!conversation) {
        socket.emit('socket_error', {
          message: `Conversation doesn't exists!`,
        })
      }

      // 2. Mark all messages of this conversation:
      await Message.updateMany(
        {
          conversation: conversation?._id as Types.ObjectId,
          sender: {
            $ne: user?._id,
          },
          isSeen: false,
        },
        {
          $set: {
            isSeen: true,
          },
        }
      )

      socket.to(conversation?._id?.toString() as string).emit('marked_as_read', {
        conversationId: conversation?._id?.toString() as string,
        readBy: user?._id?.toString(),
      })
    })

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${user.name}`)
    })
  })
}
