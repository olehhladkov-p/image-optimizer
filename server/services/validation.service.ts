import { isValidMimeType, optimizeSchema, MAX_FILES } from '../../shared/types.js';

export const ValidationService = {
  validateFiles(files: Array<{ buffer: Buffer; name: string; ext: string; mimeType: string }>): void {
    if (files.length === 0) {
      throw new Error('No images provided');
    }

    if (files.length > MAX_FILES) {
      throw new Error(`Maximum ${MAX_FILES} files allowed`);
    }

    files.forEach(file => {
      if (!isValidMimeType(file.mimeType)) {
        throw new Error(`Invalid file type: ${file.mimeType}`);
      }
    });
  },

  validateFormData(parsedBody: Record<string, string>): void {
    const validation = optimizeSchema.safeParse(parsedBody);
    if (!validation.success) {
      throw new Error('Invalid input');
    }
  },

  sanitizeFilename(name: string, fallback: string): string {
    const sanitized = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255);
    return sanitized || fallback;
  }
};
