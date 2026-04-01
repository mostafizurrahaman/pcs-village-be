import { connectDB } from '@repo/db'
import { Server } from 'http'
import configs from './app/configs'
import app from './app'
import { logger } from '@app/libs/logger'

let server: Server
//  boostrap function :
const boostrap = async () => {
  try {
    await connectDB(configs.databaseUrl)

    logger.info('✅ Database connected  successfully!')
    // server listen :
    server = app.listen(configs.port, () => {
      logger.info(`🧑‍🚀🚀 Server is running on ${configs.port}`)
    })
  } catch (err) {
    logger.error(`❌ Database connection failed ❌`, err)
  }
}

// bootstrap the project
boostrap()

// handle unhandled rejection
process.on('unhandledRejection', (reason) => {
  logger.error('unhandledRejection', {
    reason,
  })
  if (server) {
    server.close(() => {
      process.exit(1)
    })
  }

  process.exit(1)
})

// handled uncaughtException:
process.on('uncaughtException', (error) => {
  logger.error('uncaughtException: ERROR', error.message)
  process.exit(1)
})
