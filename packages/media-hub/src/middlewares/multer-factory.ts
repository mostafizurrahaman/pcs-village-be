import multer from 'multer'
import type { FileValidationConfig } from '../types'
import { multerFileFilter } from '../utils'

export const multerFactory = (config: FileValidationConfig) => {
  const { maxSizeInMB = 10 } = config

  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxSizeInMB * 1024 * 1024, // bytes
    },
    fileFilter: multerFileFilter(config),
  })
}
