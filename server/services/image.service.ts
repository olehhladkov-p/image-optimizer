import sharp from 'sharp';
import { VALID_FORMATS, SupportedFormat } from '../../shared/types.js';

/** Service for image processing operations (SRP) */
export const ImageService = {
  /** Validates if a format is supported by the application */
  isSupported(format: string): format is SupportedFormat {
    return VALID_FORMATS.includes(format as SupportedFormat);
  },

  /** Processes an image buffer into the target format */
  async process(buffer: Buffer, format: string): Promise<Buffer> {
    const sharpInstance = sharp(buffer);
    const metadata = await sharpInstance.metadata();

    // Fallback logic for format
    const targetFormat = (format || metadata.format || 'jpeg') as keyof sharp.FormatEnum;

    if (!this.isSupported(targetFormat)) {
      throw new Error(`Unsupported format: ${targetFormat}`);
    }

    return await sharpInstance.toFormat(targetFormat).toBuffer();
  }
};
