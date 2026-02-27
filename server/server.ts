import fastify from 'fastify';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import optimizeRoute from './routes/optimize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Constants & Config ---
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB

// Determine static folder (dist/client)
// In prod (dist/server/server.js), it's in ../client relative to this file

const clientPath = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, '..', 'client')
  : path.join(__dirname, '..', 'dist', 'client');

// --- Server Initialization ---
const server = fastify({
  logger: process.env.NODE_ENV !== 'production',
  disableRequestLogging: process.env.NODE_ENV === 'production'
});

// Middleware & Plugins
server.register(multipart, {
  limits: { fileSize: FILE_SIZE_LIMIT }
});

// API Routes
server.register(optimizeRoute);

// Health Check
server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// Serve static files (registered AFTER routes for lower priority)
server.register(fastifyStatic, {
  root: clientPath,
  prefix: '/',
  cacheControl: true,
  maxAge: 3600,
});

// Set a simple root handler if index.html is not automatically served
server.get('/', (_request, reply) => {
  return reply.sendFile('index.html');
});

// Catch-all to support SPA routing if needed
server.setNotFoundHandler((_request, reply) => {
  return reply.sendFile('index.html');
});

// --- Lifecycle ---
const start = async () => {
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Optimizer API & Client running on ${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
