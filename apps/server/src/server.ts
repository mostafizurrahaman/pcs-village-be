import { connectDB } from '@repo/db'
import { Server } from 'http'
import configs from './app/configs'
import app from './app'
import { logger } from '@app/libs/logger'
import { seedSuperAdmin } from '@app/libs/seed-super-admin'
import { seedClassifiedBase } from '@app/libs/seed-classified-base'
import { Server as SocketServer } from 'socket.io'
import dns from 'node:dns/promises'
import { createServer } from 'http'
import { setupChatServer, type TChatServer } from '@app/libs/socket.chat'

dns.setServers(['1.1.1.1'])
let server: Server
//  boostrap function :
const boostrap = async () => {
  try {
    await connectDB(configs.databaseUrl)

    logger.info('✅ Database connected  successfully!')

    await seedSuperAdmin()

    await seedClassifiedBase()

    // 1. setup http server
    const httpServer = createServer(app)

    // 2. Configure socket server:
    const io: TChatServer = new SocketServer(httpServer, {
      cors: {
        origin: configs.corsOrigins.split(','),
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    })

    // 3. call the chat socket:
    setupChatServer(io)

    // server listen :
    server = httpServer.listen(configs.port, () => {
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
