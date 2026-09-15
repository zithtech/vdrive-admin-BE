import { S3, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../../shared/logger';

class S3Service {
  private s3: S3;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.S3_BUCKET_NAME || '';
    if (!this.bucketName) {
      logger.warn('S3_BUCKET_NAME is not defined in environment variables');
    }

    this.s3 = new S3({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
    logger.info(
      `S3Service initialized. Bucket: ${this.bucketName}, Region: ${process.env.AWS_REGION || 'us-east-1'}`
    );
  }

  async getUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 60
  ): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn });
      const region = process.env.AWS_REGION || 'us-east-1';
      const fileUrl = `https://${this.bucketName}.s3.${region}.amazonaws.com/${key}`;

      return { uploadUrl, fileUrl, key };
    } catch (error) {
      logger.error(`Error generating upload URL for key ${key}:`, error);
      throw error;
    }
  }
}

export const s3Service = new S3Service();
