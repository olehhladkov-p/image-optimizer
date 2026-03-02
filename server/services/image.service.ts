import sharp from 'sharp';
import { VALID_FORMATS, SupportedFormat } from '../../shared/types.js';

const QUALITY: Record<string, number> = {
  jpeg: 85, jpg: 85, webp: 85, png: 90, avif: 80, tiff: 90
};

export const ImageService = {
  isSupported(format: string): format is SupportedFormat {
    return VALID_FORMATS.includes(format as SupportedFormat);
  },

  async process(buffer: Buffer, format: string): Promise<Buffer> {
    const sharpInstance = sharp(buffer);
    const targetFormat = (format || (await sharpInstance.metadata()).format || 'jpeg') as keyof sharp.FormatEnum;

    if (!this.isSupported(targetFormat)) {
      throw new Error(`Unsupported format: ${targetFormat}`);
    }

    const quality = QUALITY[targetFormat] ?? 85;

    if (targetFormat === 'png') {
      return sharpInstance.png({ quality, compressionLevel: 6 }).toBuffer();
    }
    if (targetFormat === 'gif') {
      return sharpInstance.gif().toBuffer();
    }
    if (targetFormat === 'tiff') {
      return sharpInstance.tiff({ quality }).toBuffer();
    }

    return sharpInstance.toFormat(targetFormat, { quality }).toBuffer();
  }
};
