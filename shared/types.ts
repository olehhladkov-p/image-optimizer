import { z } from 'zod';

export const VALID_FORMATS = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'avif', 'tiff'] as const;
export type SupportedFormat = typeof VALID_FORMATS[number];

export const optimizeSchema = z.object({
  name: z.string().optional(),
  format: z.enum(VALID_FORMATS).optional(),
});

export type OptimizeRequest = z.infer<typeof optimizeSchema>;
