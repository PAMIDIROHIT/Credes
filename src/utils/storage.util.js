import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const s3Client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

/**
 * Upload a file to Supabase S3 storage
 * @param {Buffer} fileBuffer - The file content
 * @param {string} fileName - Destination filename
 * @param {string} contentType - MIME type
 */
export const uploadFile = async (fileBuffer, fileName, contentType) => {
  try {
    const bucketName = 'postly-assets'; // Ensure this bucket exists in Supabase
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await s3Client.send(command);
    
    const publicUrl = `${env.S3_ENDPOINT}/${bucketName}/${fileName}`;
    return publicUrl;
  } catch (error) {
    logger.error('S3 Upload failed:', error);
    throw new Error('Storage upload failed');
  }
};
