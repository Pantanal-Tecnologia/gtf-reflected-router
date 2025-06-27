import "reflect-metadata";

import fastify, { FastifyInstance } from "fastify";
import compress from "@fastify/compress";
import cors from "@fastify/cors";
import zlib from "node:zlib";
import * as process from "node:process";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { controllerPlugin } from "./plugins/controller-plugin";
import { UserController } from "./controllers/user.controller";

export const createApp = (): FastifyInstance => {
  const isDevelopment = process.env.NODE_ENV === "development";

  return fastify({
    connectionTimeout: 30000,
    keepAliveTimeout: 5000,
    maxParamLength: 5000,
    bodyLimit: 10485760,
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
      serializers: {
        req(req) {
          return {
            method: req.method,
            url: req.url,
            hostname: req.hostname,
            remoteAddress: req.ip,
            userAgent: req.headers["user-agent"],
          };
        },
        res(res) {
          return {
            statusCode: res.statusCode,
          };
        },
      },
    },
    trustProxy: true,
    disableRequestLogging: process.env.NODE_ENV === "production",
  });
};

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
    zlibOptions: {
      level: 6,
      windowBits: 15,
      memLevel: 8,
    },
    threshold: 1024,
    encodings: ["gzip", "deflate", "br"],
  });

  await app.register(swagger, {
    swagger: {
      info: {
        title: "GTF Client Dashboard API",
        description: "API documentation for GTF Client Dashboard",
        version: "1.0.0",
      },
      externalDocs: {
        url: "https://swagger.io",
        description: "Find more info here",
      },
      host: `localhost:8080`,
      schemes: ["http", "https"],
      consumes: ["application/json"],
      produces: ["application/json"],
      securityDefinitions: {
        BearerAuth: {
          type: "apiKey",
          name: "Authorization",
          in: "header",
          description: "Enter JWT Bearer token in format: Bearer <token>",
        },
      },
      security: [{ BearerAuth: [] }],
      tags: [
        { name: "fornecedores", description: "Fornecedores related endpoints" },
        { name: "frota", description: "Frota related endpoints" },
        { name: "auth", description: "Authentication related endpoints" },
      ],
    },
    mode: "dynamic",
    hideUntagged: true,
    openapi: {
      info: {
        title: "GTF Client Dashboard API",
        description: "API documentation for GTF Client Dashboard",
        version: "1.0.0",
      },
      servers: [
        {
          url: `http://localhost:8080`,
          description: "Development server",
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Enter JWT Bearer token",
          },
        },
      },
      security: [{ BearerAuth: [] }],
      tags: [{ name: "users", description: "Users related endpoints" }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/documentation",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });
};

export const registerHooks = (app: FastifyInstance): void => {
  app.setErrorHandler(async (error, request, reply) => {
    const { method, url } = request;
    const statusCode = error.statusCode || 500;

    app.log.error(
      {
        error: {
          message: error.message,
          stack: error.stack,
          statusCode,
        },
        request: { method, url },
      },
      "Request error",
    );

    const message =
      process.env.NODE_ENV === "production" && statusCode === 500
        ? "Internal Server Error"
        : error.message;

    reply.status(statusCode).send({
      error: {
        message,
        statusCode,
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.setNotFoundHandler(async (_request, reply) => {
    reply.status(404).send({
      error: {
        message: "Route not found",
        statusCode: 404,
        timestamp: new Date().toISOString(),
      },
    });
  });
};

const startServer = async (): Promise<void> => {
  try {
    const app = createApp();
    registerHooks(app);

    await registerPlugins(app);

    app.register(controllerPlugin, {
      controllers: [UserController],
      prefix: "/api",
    });

    await app.listen({
      port: 8080,
      host: "0.0.0.0",
    });

    app.log.info(`Server running at http://0.0.0.0:8080`);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
