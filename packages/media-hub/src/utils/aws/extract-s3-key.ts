export const extractS3KeyFromUrl = (fileUrl: string): string => {
  try {
    const url = new URL(fileUrl)

    // Remove leading "/"
    const key = decodeURIComponent(url.pathname.slice(1))

    if (!key) {
      throw new Error('Invalid S3 URL: key not found')
    }

    return key
  } catch {
    throw new Error('Invalid S3 URL format')
  }
}
