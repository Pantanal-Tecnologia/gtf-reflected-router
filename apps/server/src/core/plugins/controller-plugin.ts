import fastifyPlugin from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getRoutes, getControllerPrefix, getHttpCode, getApiResponse } from "gtf-reflected-router";
import { getParamMetadata, getCustomParamMetadata } from "gtf-reflected-router";
import { ParamType } from "gtf-reflected-router";
import type { ExecutionContext, ZodLike } from "gtf-reflected-router";
import { Container } from "gtf-reflected-router";
import { getRegisteredControllers } from "gtf-reflected-router";
import { getGuards } from "gtf-reflected-router";
import type { CanActivate } from "gtf-reflected-router";
import { getInterceptors } from "gtf-reflected-router";
import type { Interceptor, CallHandler } from "gtf-reflected-router";
import type { OnApplicationBootstrap, OnApplicationShutdown } from "gtf-reflected-router";
import { z } from "zod";

export interface ControllerOptions {
  controllers?: any[];
  prefix?: string;
}

function zodToJsonSchema(schema: ZodLike): Record<string, unknown> | null {
  try {
    const jsonSchema = z.toJSONSchema(schema as any) as Record<string, unknown>;
    delete jsonSchema.$schema;
    return jsonSchema;
  } catch {
    return null;
  }
}

function isZodLikeSchema(value: unknown): value is ZodLike {
  return typeof value === "object" && value !== null && "safeParse" in (value as object);
}

function normalizeManualResponseSchemas(
  responseSchemas: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!responseSchemas) return undefined;

  const normalizedEntries = Object.entries(responseSchemas).map(([statusCode, responseSchema]) => {
    if (isZodLikeSchema(responseSchema)) {
      const jsonSchema = zodToJsonSchema(responseSchema);
      return [statusCode, jsonSchema ?? responseSchema] as const;
    }

    if (
      typeof responseSchema === "object" &&
      responseSchema !== null &&
      "schema" in (responseSchema as Record<string, unknown>)
    ) {
      const wrapped = responseSchema as Record<string, unknown>;
      const wrappedSchema = wrapped.schema;
      if (isZodLikeSchema(wrappedSchema)) {
        const jsonSchema = zodToJsonSchema(wrappedSchema);
        return [statusCode, { ...wrapped, schema: jsonSchema ?? wrappedSchema }] as const;
      }
    }

    return [statusCode, responseSchema] as const;
  });

  return Object.fromEntries(normalizedEntries);
}

function normalizeManualSchema(manualSchema: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...manualSchema };
  const normalizedResponse = normalizeManualResponseSchemas(
    manualSchema.response as Record<string, unknown> | undefined,
  );

  if (normalizedResponse) {
    normalized.response = normalizedResponse;
  }

  return normalized;
}

function buildAutoSwaggerSchema(
  Controller: any,
  handlerName: string,
): Record<string, unknown> | null {
  const builtinParams = getParamMetadata(Controller, handlerName);
  const autoSchema: Record<string, unknown> = {};

  for (const p of builtinParams) {
    if (!p.schema) continue;
    const jsonSchema = zodToJsonSchema(p.schema);
    if (!jsonSchema) continue;

    switch (p.type) {
      case ParamType.BODY:
        autoSchema.body = jsonSchema;
        break;
      case ParamType.QUERY:
        autoSchema.querystring = jsonSchema;
        break;
      case ParamType.PARAM:
        autoSchema.params = jsonSchema;
        break;
      case ParamType.HEADERS:
        autoSchema.headers = jsonSchema;
        break;
    }
  }

  return Object.keys(autoSchema).length > 0 ? autoSchema : null;
}

function getDefaultSuccessStatus(method: string, explicitHttpCode?: number): number {
  if (explicitHttpCode !== undefined) {
    return explicitHttpCode;
  }

  return method.toUpperCase() === "POST" ? 201 : 200;
}

function buildAutoSwaggerResponseSchema(
  method: string,
  explicitHttpCode?: number,
  Controller?: any,
  handlerName?: string,
): Record<string, unknown> {
  const successStatus = getDefaultSuccessStatus(method, explicitHttpCode);

  if (Controller && handlerName) {
    const apiResponse = getApiResponse(Controller, handlerName);
    if (apiResponse) {
      let jsonSchema = zodToJsonSchema(apiResponse.schema);
      if (jsonSchema && apiResponse.isArray) {
        jsonSchema = { type: "array", items: jsonSchema };
      }
      return {
        response: {
          [successStatus]: {
            description: apiResponse.description ?? "Successful response",
            ...(jsonSchema ?? { type: "object", additionalProperties: true }),
          },
        },
      };
    }
  }

  return {
    response: {
      [successStatus]: {
        description: "Successful response",
        type: "object",
        additionalProperties: true,
      },
    },
  };
}

function mergeSwaggerSchemas(
  autoSchema: Record<string, unknown> | null,
  manualSchema: Record<string, unknown>,
): Record<string, unknown> {
  const merged = autoSchema ? { ...autoSchema, ...manualSchema } : { ...manualSchema };

  const autoResponse = (autoSchema?.response as Record<string, unknown> | undefined) ?? {};
  const manualResponse = (manualSchema.response as Record<string, unknown> | undefined) ?? {};

  if (Object.keys(autoResponse).length > 0 || Object.keys(manualResponse).length > 0) {
    merged.response = { ...autoResponse, ...manualResponse };
  }

  return merged;
}

function createExecutionContext(
  request: FastifyRequest,
  reply: FastifyReply,
  ControllerClass: any,
  handlerName: string,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: <T = any>() => request as T,
      getReply: <T = any>() => reply as T,
    }),
    getHandler: () => (ControllerClass.prototype as Record<string, any>)[handlerName],
    getClass: () => ControllerClass,
  };
}

async function resolveGuardInstance(
  guard: (new (...args: any[]) => CanActivate) | CanActivate,
): Promise<CanActivate> {
  if (typeof guard === "function") {
    return Container.get(guard as new (...args: any[]) => CanActivate);
  }
  return guard;
}

async function resolveInterceptorInstance(
  interceptor: (new (...args: any[]) => Interceptor) | Interceptor,
): Promise<Interceptor> {
  if (typeof interceptor === "function") {
    return Container.get(interceptor as new (...args: any[]) => Interceptor);
  }
  return interceptor;
}

export const controllerPlugin = fastifyPlugin(
  async (fastify: FastifyInstance, options: ControllerOptions) => {
    const { controllers, prefix = "" } = options;
    const resolvedControllers = controllers ?? getRegisteredControllers();

    resolvedControllers.forEach((Controller) => {
      const controllerInstance: any = Container.get(Controller);
      const routes = getRoutes(Controller);
      const controllerPrefix = getControllerPrefix(Controller);

      routes.forEach((route) => {
        const fullPath = prefix + controllerPrefix + route.path;

        const routeHttpCode = getHttpCode(Controller, route.handler);
        const autoParamsSchema = buildAutoSwaggerSchema(Controller, route.handler) ?? {};
        const autoResponseSchema = buildAutoSwaggerResponseSchema(
          route.method,
          routeHttpCode,
          Controller,
          route.handler,
        );
        const autoSchema = { ...autoParamsSchema, ...autoResponseSchema };
        const manualSchema = normalizeManualSchema(
          (route.options?.schema as Record<string, unknown>) ?? {},
        );
        const mergedSchema = mergeSwaggerSchemas(autoSchema, manualSchema);

        fastify.route({
          method: route.method,
          url: fullPath,
          schema: Object.keys(mergedSchema).length > 0 ? mergedSchema : undefined,
          handler: async (request: FastifyRequest, reply: FastifyReply) => {
            const ctx = createExecutionContext(request, reply, Controller, route.handler);

            // Phase 5: Execute guards
            const guards = getGuards(Controller, route.handler);
            for (const guard of guards) {
              const instance = await resolveGuardInstance(guard);
              const canProceed = await instance.canActivate(ctx);
              if (!canProceed) {
                return reply.status(403).send({ error: "Forbidden" });
              }
            }

            const builtinParams = getParamMetadata(Controller, route.handler);
            const customParams = getCustomParamMetadata(Controller, route.handler);
            const hasParamDecorators = builtinParams.length > 0 || customParams.length > 0;

            const invokeHandler = async (): Promise<unknown> => {
              if (!hasParamDecorators) {
                return controllerInstance[route.handler].call(controllerInstance, request, reply);
              }

              const maxIndex = Math.max(
                ...builtinParams.map((p) => p.index),
                ...customParams.map((p) => p.index),
                -1,
              );
              const args: unknown[] = new Array(maxIndex + 1);

              // Phase 2 + 8: Resolve builtin params with optional Zod validation
              for (const p of builtinParams) {
                let value: unknown;
                switch (p.type) {
                  case ParamType.BODY:
                    value = p.key
                      ? (request.body as Record<string, unknown>)?.[p.key]
                      : request.body;
                    break;
                  case ParamType.QUERY:
                    value = p.key
                      ? (request.query as Record<string, unknown>)?.[p.key]
                      : request.query;
                    break;
                  case ParamType.PARAM:
                    value = p.key
                      ? (request.params as Record<string, unknown>)?.[p.key]
                      : request.params;
                    break;
                  case ParamType.HEADERS:
                    value = p.key
                      ? (request.headers as Record<string, unknown>)?.[p.key]
                      : request.headers;
                    break;
                  case ParamType.REQUEST:
                    value = request;
                    break;
                  case ParamType.REPLY:
                    value = reply;
                    break;
                }

                // Phase 8: Zod validation
                if (p.schema) {
                  const result = p.schema.safeParse(value);
                  if (!result.success) {
                    return reply.status(400).send({
                      error: {
                        message: "Validation failed",
                        statusCode: 400,
                        details: result.error.flatten(),
                      },
                    });
                  }
                  value = result.data;
                }

                args[p.index] = value;
              }

              // Phase 2: Resolve custom param decorators
              for (const cp of customParams) {
                args[cp.index] = await cp.factory(cp.data, ctx);
              }

              return controllerInstance[route.handler].call(controllerInstance, ...args);
            };

            // Phase 6: Execute interceptors
            const interceptorList = getInterceptors(Controller, route.handler);
            let result: unknown;

            if (interceptorList.length === 0) {
              result = await invokeHandler();
            } else {
              const chain = interceptorList.reduceRight<() => Promise<unknown>>(
                (next, interceptorDef) => async () => {
                  const instance = await resolveInterceptorInstance(interceptorDef);
                  const callHandler: CallHandler = { handle: next };
                  return instance.intercept(ctx, callHandler);
                },
                invokeHandler,
              );
              result = await chain();
            }

            // Phase 7: Apply @HttpCode
            if (routeHttpCode !== undefined) {
              void reply.status(routeHttpCode);
            }

            return result;
          },
          ...(() => {
            const { schema: _schema, ...rest } = route.options ?? {};
            return rest;
          })(),
        });
      });
    });

    // Phase 9: Call onApplicationBootstrap on all controller instances
    for (const Controller of resolvedControllers) {
      const instance = Container.get(Controller) as Partial<OnApplicationBootstrap>;
      if (typeof instance.onApplicationBootstrap === "function") {
        await instance.onApplicationBootstrap();
      }
    }

    // Phase 9: Register onApplicationShutdown via Fastify onClose hook
    fastify.addHook("onClose", async () => {
      for (const Controller of resolvedControllers) {
        const instance = Container.get(Controller) as Partial<OnApplicationShutdown>;
        if (typeof instance.onApplicationShutdown === "function") {
          await instance.onApplicationShutdown();
        }
      }
    });
  },
  {
    name: "controller-plugin",
  },
);
