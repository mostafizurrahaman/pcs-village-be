import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { s3Client } from '../../configs/aws.config'
import { extractS3KeyFromUrl } from './extract-s3-key'

export const deleteSingleFileFromS3 = async (url: string) => {
  const key = extractS3KeyFromUrl(url)

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
    })
  )
}
