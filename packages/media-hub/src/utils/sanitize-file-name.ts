export const senitizeFileName = (file: Express.Multer.File, folder: string) => {
  const sanitized = file.originalname.replace(/\s+/g, '_')
  const key = `${folder}/${Date.now()}-${sanitized}`
  return key
}
