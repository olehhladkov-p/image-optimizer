import { z } from 'zod';

export const VALID_FORMATS = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'avif', 'tiff'] as const;
export type SupportedFormat = typeof VALID_FORMATS[number];

export const VALID_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/tiff'
] as const;
export type ValidMimeType = typeof VALID_MIME_TYPES[number];

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_FILES = 20;

export const optimizeSchema = z.object({
  name: z.string().max(255).optional(),
  format: z.enum(VALID_FORMATS).optional(),
});

export type OptimizeRequest = z.infer<typeof optimizeSchema>;

export const isValidMimeType = (mime: string): mime is ValidMimeType => {
  return VALID_MIME_TYPES.includes(mime as ValidMimeType);
};
