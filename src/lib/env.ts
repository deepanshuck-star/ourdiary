import { z } from 'zod';

export const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().default('http://localhost:3000'),
});

export function isPlaceholder(val: string | undefined): boolean {
  if (!val) return true;
  return (
    val.includes('YOUR_PROJECT') ||
    val.includes('YOUR_SUPABASE') ||
    val.includes('YOUR_CLOUD_NAME') ||
    val.includes('YOUR_CLOUDINARY') ||
    val.trim() === ''
  );
}

export function getAppEnvironment() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const cloudinaryCloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const cloudinaryKey = process.env.CLOUDINARY_API_KEY;
  const cloudinarySecret = process.env.CLOUDINARY_API_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const isSupabaseConfigured = !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseKey);
  const isCloudinaryConfigured =
    !isPlaceholder(cloudinaryCloud) &&
    !isPlaceholder(cloudinaryKey) &&
    !isPlaceholder(cloudinarySecret);

  return {
    isSupabaseConfigured,
    isCloudinaryConfigured,
    isDemoMode: !isSupabaseConfigured,
    supabaseUrl: isSupabaseConfigured ? supabaseUrl : undefined,
    supabaseKey: isSupabaseConfigured ? supabaseKey : undefined,
    cloudinaryCloud: isCloudinaryConfigured ? cloudinaryCloud : undefined,
    siteUrl,
  };
}
