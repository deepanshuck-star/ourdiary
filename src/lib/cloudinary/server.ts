import { v2 as cloudinary } from 'cloudinary';
import { getAppEnvironment } from '@/lib/env';

// Server-only Cloudinary configuration
export function getCloudinaryClient() {
  const env = getAppEnvironment();
  if (!env.isCloudinaryConfigured) {
    return null;
  }

  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return cloudinary;
}

export interface SignUploadParams {
  folder: string;
  timestamp: number;
  resourceType?: 'image' | 'video' | 'auto';
  eager?: string;
}

export function generateUploadSignature(params: SignUploadParams) {
  const client = getCloudinaryClient();
  if (!client) {
    throw new Error('Cloudinary credentials are not configured.');
  }

  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  const signatureParams: Record<string, any> = {
    folder: params.folder,
    timestamp: params.timestamp,
  };

  if (params.eager) {
    signatureParams.eager = params.eager;
  }

  const signature = client.utils.api_sign_request(signatureParams, apiSecret);

  return {
    signature,
    timestamp: params.timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
    folder: params.folder,
  };
}

export async function deleteCloudinaryAsset(
  publicId: string,
  resourceType: 'image' | 'video' = 'image'
) {
  const client = getCloudinaryClient();
  if (!client) {
    throw new Error('Cloudinary credentials are not configured.');
  }

  return await client.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });
}
