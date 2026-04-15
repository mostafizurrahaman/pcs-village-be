import { Conversation, User, Wave, WaveStatus, type IUser } from 'packages/db/src'
import type { ICreateWavePayload } from './wave.validations'
import { AppError } from 'packages/shared/src'
import httpStatus from 'http-status'
import mongoose from 'mongoose'

// 1. Send Wave
const createWave = async (user: IUser, payload: ICreateWavePayload) => {
  const { receiver: receiverId } = payload

  // 1.  Check is receiver exists ?
  const receiver = await User.findById(receiverId)
  if (!receiver) {
    throw new AppError(httpStatus.NOT_FOUND, `Receiver account doesn't exists!`)
  }

  // 2. Check reciver and your id is same ?:
  if (receiver?._id?.toString() === user?._id?.toString()) {
    throw new AppError(httpStatus.BAD_REQUEST, `You cann't send wave yourself!`)
  }

  // 3. Check any wave exists ?:
  const [incomingWave, outgoingWave] = await Promise.all([
    // incomming
    await Wave.findOne({
      sender: receiver?._id,
      receiver: user?._id,
    }),
    // outgoing
    await Wave.findOne({
      sender: user?._id,
      receiver: receiver?._id,
    }),
  ])

  // 4. Check is they already connnected?
  if (
    outgoingWave?.status === WaveStatus.ACCEPTED ||
    incomingWave?.status === WaveStatus.ACCEPTED
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, `You are already connected!`)
  }

  //  5. Check has any pending wave for this reciver and current user?
  if (outgoingWave?.status === WaveStatus.PENDING) {
    throw new AppError(httpStatus.BAD_REQUEST, `Wave already pending. Wait for them to respond!`)
  }

  // 5. Logic: Check for "Reverse Wave" (Auto-Accept)
  if (incomingWave?.status === WaveStatus.PENDING) {
    const result = await Wave.findByIdAndUpdate(
      incomingWave._id,
      { status: WaveStatus.ACCEPTED },
      { new: true }
    )

    await Conversation?.create({
      participant: [user?._id, receiver?._id],
      initiator: receiver?._id,
    })

    return { wave: result, matched: true }
  }

  // 6. Logic: Check is the user declined the group?:
  if (outgoingWave?.status === WaveStatus.DECLINED) {
    const lastDeclined = outgoingWave?.updatedAt as unknown as Date
    const cooldownMs = 24 * 60 * 60 * 1000 // 24 hours
    if (Date.now() - lastDeclined.getTime() < cooldownMs) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        `You can only re-wave after 24 hours of being declined.`
      )
    }

    // Reset declined wave to pending
    outgoingWave.status = WaveStatus.PENDING
    await outgoingWave.save()
    return { wave: outgoingWave, matched: false }
  }

  //   7. Create totally new wave:
  const wave = await Wave.create({
    sender: user?._id,
    receiver: receiver?._id,
    status: WaveStatus.PENDING,
  })

  return wave
}


// 2. Back Wave ** 
const acceptWave = async(user:IUser, id: string ) => { 

  const session = await mongoose.startSession()

  try {

    await session.startTransaction()

  // 1. Check is wave exists ? 
  const wave = await Wave.findById(id)
  if(!wave){ 
    throw new AppError(httpStatus.NOT_FOUND,`Wave doesn't exists!`)
  }

  // 2. Check is this wave send to you?: 
  if(wave.receiver?.toString() !== user?._id?.toString()){ 
    throw new AppError(httpStatus.BAD_REQUEST, `You don't have permission to back this wave!`)
  }

  // 3. Check the wave current status : 
  if(wave.status !== WaveStatus.PENDING) { 
    throw new AppError(httpStatus.BAD_REQUEST,  `Wave is already ${wave.status}`)
  }

  //4. Check conversation count: 
   const conversationCount = await Conversation.countDocuments({ 
     initiator: wave.sender
   })

  //  TODO: SUBSCRIPTION CHECK PENDING 



    const existingConversation = await Conversation.findOne({ 
      participant: { 
        $all: [wave.sender, wave.receiver]
      }, 
      $expr: { 
      $eq: [{$size: '$participant'
      }, 2]
      }
    }).session(session)

    if(existingConversation){ 
        wave.status = WaveStatus.ACCEPTED
        await wave.save({ session})
        await session.commitTransaction()
        return existingConversation
    } 

    // 5. Wave status updated: 
    wave.status = WaveStatus.ACCEPTED
    await wave.save({ session });


    // 6. Create new conversation: 
    const [newConversation] = await Conversation.create([{
      participant: [wave.sender, wave.receiver], 
      initiator: wave.sender, 
      isActive: true    
    }], { session })

    await session.commitTransaction()
    await session.endSession()

    return newConversation

  } catch (error: any) {
    await session.abortTransaction()
    await session.endSession()
     throw new AppError(httpStatus.NOT_FOUND,  error.message || `Failed to back wave!`)
  }

}



export const waveServices = { 
   createWave, 
   acceptWave
}