import type multer from 'multer'
import type { FileValidationConfig } from '../types'
import type { Request } from 'express'
import { isFileExtensionAllowed } from './filter-by-extension'

export const multerFileFilter = (config: FileValidationConfig) => {
  return (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    try {
      const isAllowed = isFileExtensionAllowed(file.originalname, config)
      if (!isAllowed) {
        cb(new Error(`File type not allowed: ${file.originalname}`))
      }

      cb(null, true)
    } catch (err) {
      cb(err as Error)
    }
  }
}
