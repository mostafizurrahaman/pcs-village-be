import { GetObjectAclCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3Client } from '../../configs/aws.config'

export const getSignedUrlForS3 = async (key: string, expiresInSeconds: number) => {
  const command = new GetObjectAclCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
  })

  return await getSignedUrl(s3Client, command, {
    expiresIn: expiresInSeconds,
  })
}
