/* eslint-disable @typescript-eslint/no-unused-vars */
import mongoose from 'mongoose'

export const connectDB = async (uri: string) => {
  try {
    await mongoose.connect(uri)
  } catch (err: unknown) {
    console.log(`Database connection failed!`)
  }
}
