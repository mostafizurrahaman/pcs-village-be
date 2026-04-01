// packages/logger/src/utils/get-logger.ts
import * as winston from 'winston'
import 'winston-daily-rotate-file'

const { combine, timestamp, errors, printf, colorize, json, uncolorize } = winston.format

const uppercaseLevel = winston.format((info) => {
  info.level = info.level.toUpperCase() // done once here
  return info
})

const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const cleanMessage = typeof message === 'string' ? message.replace(/\n/g, ' ') : message

  const metaString =
    meta && Object.keys(meta).length
      ? `\n    ${JSON.stringify(meta, null, 2).replace(/\n/g, '\n    ')}`
      : ''

  const bold = '\x1b[1m'
  const reset = '\x1b[0m'

  return `${bold}${timestamp}${reset} ${bold}[${String(level)}]${reset} ${stack || cleanMessage}${metaString}`
})

const devSaveFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const cleanMessage = typeof message === 'string' ? message.replace(/\n/g, ' ') : message

  const metaString =
    meta && Object.keys(meta).length
      ? `\n    ${JSON.stringify(meta, null, 2).replace(/\n/g, '\n    ')}`
      : ''

  return `${timestamp} [${String(level)}] ${stack || cleanMessage}${metaString}`
})

// Define an interface for options
export interface LoggerOptions {
  level?: string
  isProduction: boolean
  logDirectory?: string
  appName?: string
}

winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
})

export const getLogger = (options: LoggerOptions): winston.Logger => {
  const { isProduction, level, logDirectory = './logs', appName = 'app' } = options

  const logger = winston.createLogger({
    level: level || (isProduction ? 'info' : 'debug'),
    format: combine(
      uppercaseLevel(),
      colorize({ all: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      isProduction ? json() : combine(colorize(), devFormat)
    ),
    defaultMeta: { service: appName },
    transports: [
      new winston.transports.Console({
        handleExceptions: true,
        handleRejections: true,
      }),
    ],
    exitOnError: false,
  })

  if (!isProduction) {
    logger.add(
      new winston.transports.DailyRotateFile({
        level: 'debug',
        filename: `${logDirectory}/${appName}-dev-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: combine(uncolorize(), devSaveFormat),
      })
    )
  }

  if (isProduction) {
    logger.add(
      new winston.transports.DailyRotateFile({
        filename: `${logDirectory}/${appName}-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
      })
    )
  }

  return logger
}
