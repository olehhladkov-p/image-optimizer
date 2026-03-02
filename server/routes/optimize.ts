import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { ValidationService } from '../services/validation.service.js';
import { ImageService } from '../services/image.service.js';
import { FileUtils } from '../utils/file.utils.js';
import JSZip from 'jszip';

interface ParsedFile {
  buffer: Buffer;
  name: string;
  ext: string;
  mimeType: string;
}

interface ProcessResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

interface RequestData {
  files: ParsedFile[];
  formData: Record<string, string>;
}

const parseRequest = async (request: FastifyRequest): Promise<RequestData> => {
  const files: ParsedFile[] = [];
  const formData: Record<string, string> = {};

  for await (const part of request.parts()) {
    if (part.type === 'file') {
      const { name, ext } = FileUtils.parseFileName(part.filename);
      files.push({
        buffer: await part.toBuffer(),
        name,
        ext,
        mimeType: part.mimetype ?? ''
      });
    } else {
      formData[part.fieldname] = part.value as string;
    }
  }

  return { files, formData };
};

const processSingleFile = async (file: ParsedFile, formData: Record<string, string>): Promise<ProcessResult> => {
  const targetFormat = formData['format'] || file.ext;
  const finalName = ValidationService.sanitizeFilename(formData['name'] || file.name, 'optimized');
  const optimizedBuffer = await ImageService.process(file.buffer, targetFormat);

  const filename = `${finalName}.${targetFormat || 'jpeg'}`;
  return {
    buffer: optimizedBuffer,
    contentType: `image/${targetFormat || 'jpeg'}`,
    filename
  };
};

const processMultipleFiles = async (files: ParsedFile[], formData: Record<string, string>): Promise<ProcessResult> => {
  const zip = new JSZip();
  const format = formData['format'];

  await Promise.all(
    files.map(async (file) => {
      const targetFormat = format || file.ext;
      const optimizedBuffer = await ImageService.process(file.buffer, targetFormat);
      const safeName = ValidationService.sanitizeFilename(file.name, 'image');
      zip.file(`${safeName}.${targetFormat || 'jpeg'}`, optimizedBuffer);
    })
  );

  return {
    buffer: await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } }),
    contentType: 'application/zip',
    filename: 'optimized.zip'
  };
};

const handleOptimizationError = (error: unknown, reply: FastifyReply) => {
  const message = error instanceof Error ? error.message : 'Failed to optimize images';
  const statusCode = error instanceof Error && (message.includes('Invalid') || message.includes('No images')) ? 400 : 500;
  return reply.status(statusCode).send({ error: message });
};

const optimizeRoute: FastifyPluginAsync = async (server) => {
  server.post('/optimize', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { files, formData } = await parseRequest(request);

      ValidationService.validateFiles(files);
      ValidationService.validateFormData(formData);

      const result = files.length === 1
        ? await processSingleFile(files[0]!, formData)
        : await processMultipleFiles(files, formData);

      const encodedFilename = encodeURIComponent(result.filename);

      return reply
        .header('Content-Type', result.contentType)
        .header('Content-Disposition', `attachment; filename="${result.filename}"; filename*=UTF-8''${encodedFilename}`)
        .send(result.buffer);
    } catch (error) {
      return handleOptimizationError(error, reply);
    }
  });
};

export default optimizeRoute;
