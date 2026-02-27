import { FastifyPluginAsync } from 'fastify';
import { optimizeSchema } from '../../shared/types.js';
import { ImageService } from '../services/image.service.js';
import { FileUtils } from '../utils/file.utils.js';

/** Handles image optimization requests (Controller / Route) */
const optimizeRoute: FastifyPluginAsync = async (server) => {
  server.post('/optimize', async (request, reply) => {
    let fileBuffer: Buffer | null = null;
    let originalName = 'image';
    let originalExt = '';
    const parsedBody: Record<string, string> = {};

    try {
      // 1. Multipart Parsing
      for await (const part of request.parts()) {
        if (part.type === 'file') {
          fileBuffer = await part.toBuffer();
          const { name, ext } = FileUtils.parseFileName(part.filename);
          originalName = name;
          originalExt = ext;
        } else {
          parsedBody[part.fieldname] = part.value as string;
        }
      }

      if (!fileBuffer) {
        return reply.status(400).send({ error: 'No image provided' });
      }

      // 2. Validation
      const validation = optimizeSchema.safeParse(parsedBody);
      if (!validation.success) {
        return reply.status(400).send({ error: validation.error.issues[0]?.message || 'Invalid input' });
      }

      const { name, format } = validation.data;
      const targetFormat = format || originalExt;
      const finalName = name || originalName || 'optimized';

      // 3. Processing (Service Layer)
      const optimizedBuffer = await ImageService.process(fileBuffer, targetFormat);

      // 4. Response
      reply.header('Content-Type', `image/${targetFormat || 'jpeg'}`);
      reply.header('Content-Disposition', `attachment; filename="${finalName}.${targetFormat || 'jpeg'}"`);
      return reply.send(optimizedBuffer);

    } catch (error) {
      server.log.error(error);
      const message = error instanceof Error ? error.message : 'Failed to optimize image';
      return reply.status(500).send({ error: message });
    }
  });
};

export default optimizeRoute;
