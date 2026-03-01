import { FastifyPluginAsync } from 'fastify';
import { optimizeSchema } from '../../shared/types.js';
import { ImageService } from '../services/image.service.js';
import { FileUtils } from '../utils/file.utils.js';
import JSZip from 'jszip';

/** Handles image optimization requests (Controller / Route) */
const optimizeRoute: FastifyPluginAsync = async (server) => {
  server.post('/optimize', async (request, reply) => {
    const files: Array<{ buffer: Buffer; name: string; ext: string }> = [];
    const parsedBody: Record<string, string> = {};

    try {
      // 1. Multipart Parsing
      for await (const part of request.parts()) {
        if (part.type === 'file') {
          const buffer = await part.toBuffer();
          const { name, ext } = FileUtils.parseFileName(part.filename);
          files.push({ buffer, name, ext });
        } else {
          parsedBody[part.fieldname] = part.value as string;
        }
      }

      if (files.length === 0) {
        return reply.status(400).send({ error: 'No images provided' });
      }

      // 2. Validation
      const validation = optimizeSchema.safeParse(parsedBody);
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error.issues[0]?.message || 'Invalid input' });
      }

      const { name, format } = validation.data;

      // 3. Single File Optimization (Backward Compatibility)
      if (files.length === 1) {
        const file = files[0];
        const targetFormat = format || file.ext;
        const finalName = name || file.name || 'optimized';
        const optimizedBuffer = await ImageService.process(file.buffer, targetFormat);

        reply.header('Content-Type', `image/${targetFormat || 'jpeg'}`);
        reply.header('Content-Disposition', `attachment; filename="${finalName}.${targetFormat || 'jpeg'}"`);
        return reply.send(optimizedBuffer);
      }

      // 4. Multiple File Optimization (ZIP)
      const zip = new JSZip();

      await Promise.all(
        files.map(async (file) => {
          const targetFormat = format || file.ext;
          const optimizedBuffer = await ImageService.process(file.buffer, targetFormat);
          zip.file(`${file.name}.${targetFormat || 'jpeg'}`, optimizedBuffer);
        })
      );

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

      reply.header('Content-Type', 'application/zip');
      reply.header('Content-Disposition', 'attachment; filename="optimized.zip"');
      return reply.send(zipBuffer);

    } catch (error) {
      server.log.error(error);
      const message = error instanceof Error ? error.message : 'Failed to optimize images';
      return reply.status(500).send({ error: message });
    }
  });
};

export default optimizeRoute;
