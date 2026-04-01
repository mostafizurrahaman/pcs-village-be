import type {
  ARCHIVE_EXTENSIONS,
  AUDIO_EXTENSIONS,
  DOCUMENT_EXTENSIONS,
  FILE_CATEGORY_MAP,
  IMAGE_EXTENSIONS,
  PRESENTATION_EXTENSIONS,
  SPREADSHEET_EXTENSIONS,
  TEXT_EXTENSIONS,
  VIDEO_EXTENSIONS,
} from '../constants'

export type ImageExtension = (typeof IMAGE_EXTENSIONS)[number]
export type VideoExtension = (typeof VIDEO_EXTENSIONS)[number]
export type AudioExtension = (typeof AUDIO_EXTENSIONS)[number]
export type DocumentExtension = (typeof DOCUMENT_EXTENSIONS)[number]
export type SpreadsheetExtension = (typeof SPREADSHEET_EXTENSIONS)[number]
export type PresentationExtension = (typeof PRESENTATION_EXTENSIONS)[number]
export type ArchiveExtension = (typeof ARCHIVE_EXTENSIONS)[number]
export type TextExtension = (typeof TEXT_EXTENSIONS)[number]

export type FileExtension =
  | ImageExtension
  | VideoExtension
  | AudioExtension
  | DocumentExtension
  | SpreadsheetExtension
  | PresentationExtension
  | ArchiveExtension
  | TextExtension

export type FileCategory = keyof typeof FILE_CATEGORY_MAP

export interface FileValidationConfig {
  category?: FileCategory
  allowedExtensions?: FileExtension[] // override and mix you can priority
  maxSizeInMB?: number
}


export interface UploadedFile {
  key: string;
  url: string;
  provider: 'aws';
}
