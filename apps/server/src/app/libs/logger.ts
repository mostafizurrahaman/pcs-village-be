import { getLogger } from '@repo/logger'
import configs from '../configs'
import * as winston from 'winston'

// CONFIGURE ():
export const logger: winston.Logger = getLogger({
  isProduction: configs.nodeEnv === `production`,
  appName: configs.site.name.toLowerCase().replace(/\s+/g, '-'),
  logDirectory: './logs',
  // level: choose level if needed
})
