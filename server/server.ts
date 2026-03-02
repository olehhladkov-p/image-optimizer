import fastify from 'fastify';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyCors from '@fastify/cors';
import path from 'path';
import { fileURLToPath } from 'url';
import optimizeRoute from './routes/optimize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
const FILE_SIZE_LIMIT = 10 * 1024 * 1024;

const clientPath = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, '..', 'client')
  : path.join(__dirname, '..', 'dist', 'client');

const server = fastify({
  logger: process.env.NODE_ENV === 'production'
    ? { level: 'error' }
    : { level: 'info' },
  disableRequestLogging: process.env.NODE_ENV === 'production',
  requestTimeout: 30000,
  maxParamLength: 500,
});

await server.register(fastifyRateLimit, {
  max: 100,
  timeWindow: '1 minute',
  errorResponseBuilder: () => ({
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    statusCode: 429
  })
});

await server.register(fastifyCors, {
  origin: process.env.CORS_ORIGIN ?? true,
  credentials: true,
});

server.register(multipart, {
  limits: {
    fileSize: FILE_SIZE_LIMIT,
    files: 20
  }
});

server.register(optimizeRoute);

server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

server.register(fastifyStatic, {
  root: clientPath,
  prefix: '/',
  cacheControl: true,
  maxAge: 3600,
});

server.get('/', (_request, reply) => {
  return reply.sendFile('index.html');
});

server.setNotFoundHandler((_request, reply) => {
  return reply.sendFile('index.html');
});

const start = async () => {
  try {
    await server.listen({ port: PORT, host: HOST });
    console.log(`🚀 Optimizer API & Client running on ${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
