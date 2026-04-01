import { FILE_CATEGORY_MAP } from '../constants'
import type { FileExtension, FileValidationConfig } from '../types'
import { AppError } from '@repo/shared'
import httpStatus from 'http-status'

export const isFileExtensionAllowed = (filename: string, config: FileValidationConfig) => {
  const extension = filename.split('.').pop()?.toLowerCase()

  if (!extension) return false

  const allowedExtensions: readonly FileExtension[] =
    config.allowedExtensions ?? (config?.category ? FILE_CATEGORY_MAP[config.category] : [])

  if (!allowedExtensions.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'File filter config is invalid: no extensions defined'
    )
  }

  return allowedExtensions.includes(extension as FileExtension)
}
