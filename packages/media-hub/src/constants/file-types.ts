/* ================= IMAGE ================= */
export const IMAGE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'bmp',
  'tiff',
  'svg',
  'heic',
  'avif',
] as const

/* ================= VIDEO ================= */
export const VIDEO_EXTENSIONS = [
  'mp4',
  'mov',
  'avi',
  'mkv',
  'webm',
  'flv',
  'wmv',
  '3gp',
  'm4v',
] as const

/* ================= AUDIO ================= */
export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a'] as const

/* ================= DOCUMENT ================= */
export const DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'txt', 'rtf'] as const

/* ================= SPREADSHEET ================= */
export const SPREADSHEET_EXTENSIONS = ['xls', 'xlsx', 'csv', 'ods'] as const

/* ================= PRESENTATION ================= */
export const PRESENTATION_EXTENSIONS = ['ppt', 'pptx', 'odp'] as const

/* ================= ARCHIVE ================= */
export const ARCHIVE_EXTENSIONS = ['zip', 'rar', '7z', 'tar', 'gz'] as const

/* ================= TEXT / CODE ================= */
export const TEXT_EXTENSIONS = ['txt', 'md', 'json', 'xml', 'yaml', 'yml', 'csv'] as const

export const FILE_CATEGORY_MAP = {
  image: IMAGE_EXTENSIONS,
  video: VIDEO_EXTENSIONS,
  audio: AUDIO_EXTENSIONS,
  document: DOCUMENT_EXTENSIONS,
  spreadsheet: SPREADSHEET_EXTENSIONS,
  presentation: PRESENTATION_EXTENSIONS,
  archive: ARCHIVE_EXTENSIONS,
  text: TEXT_EXTENSIONS,
} as const

