import "reflect-metadata";

import fastify, { type FastifyInstance } from "fastify";
import compress from "@fastify/compress";
import cors from "@fastify/cors";
import zlib from "node:zlib";
import * as process from "node:process";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

import path from "node:path";
import { fileURLToPath } from "node:url";
import { controllerPlugin } from "./core/plugins/controller-plugin";
import { discoverControllers } from "gtf-reflected-router";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates and configures the Fastify application instance.
 */
export const createApp = (): FastifyInstance => {
  const isDevelopment = process.env.NODE_ENV === "development";

  return fastify({
    connectionTimeout: 30000,
    keepAliveTimeout: 5000,
    logger: {
      level: process.env.LOG_LEVEL || (isDevelopment ? "info" : "warn"),
      transport: isDevelopment
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          }
        : undefined,
      redact: ["req.headers.authorization", "req.headers.cookie"],
    },
    trustProxy: true,
    disableRequestLogging: !isDevelopment,
  });
};

/**
 * Registers core plugins and documentation tools.
 */
export const registerPlugins = async (app: FastifyInstance): Promise<void> => {
  await app.register(cors, {
    origin: ["*"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  });

  await app.register(compress, {
    requestEncodings: ["gzip", "deflate", "br"],
    inflateIfDeflated: true,
    brotliOptions: {
      params: {
        [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
        [zlib.constants.BROTLI_PARAM_QUALITY]: 6,
      },
    },
    zlibOptions: { level: 6 },
    threshold: 1024,
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "GTF Reflected Router API",
        description: "Modern, declarative API documentation",
        version: "1.0.0",
      },
      servers: [{ url: `http://localhost:8080`, description: "Development" }],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [{ BearerAuth: [] }],
      tags: [
        { name: "auth", description: "Authentication layer" },
        { name: "users", description: "User management" },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/documentation",
    uiConfig: { docExpansion: "list", deepLinking: false },
  });
};

/**
 * Registers global hooks and error handlers.
 */
export const registerHooks = (app: FastifyInstance): void => {
  app.setErrorHandler(async (error, request, reply) => {
    const statusCode = error.statusCode || 500;

    app.log.error(
      { error, request: { method: request.method, url: request.url } },
      "Unhandled Error",
    );

    reply.status(statusCode).send({
      error: {
        message:
          statusCode === 500 && process.env.NODE_ENV === "production"
            ? "Internal Server Error"
            : error.message,
        statusCode,
        timestamp: new Date().toISOString(),
        details: (error as any).details,
      },
    });
  });
};

/**
 * Main entry point to start the server.
 */
const startServer = async (): Promise<void> => {
  try {
    const app = createApp();
    registerHooks(app);
    await registerPlugins(app);

    // Auto-discover all *.controller.ts files under modules/
    await discoverControllers({ cwd: path.join(__dirname, "modules") });

    // Register Controllers via our custom plugin (uses registry automatically)
    await app.register(controllerPlugin, { prefix: "/api" });

    const port = Number(process.env.PORT) || 8080;
    await app.listen({ port, host: "0.0.0.0" });

    app.log.info(`🚀 Server ready at http://0.0.0.0:${port}`);
    app.log.info(`📝 Swagger docs: http://0.0.0.0:${port}/documentation`);
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
