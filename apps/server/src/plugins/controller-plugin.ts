import fastifyPlugin from "fastify-plugin";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  getRoutes,
  getControllerPrefix,
  getHttpCode,
} from "../../../../packages/reflected/src/decorators.js";
import {
  getParamMetadata,
  getCustomParamMetadata,
} from "../../../../packages/reflected/src/params.js";
import { ParamType } from "../../../../packages/reflected/src/types.js";
import type { ExecutionContext } from "../../../../packages/reflected/src/types.js";
import { Container } from "../../../../packages/reflected/src/container.js";
import { getRegisteredControllers } from "../../../../packages/reflected/src/discovery.js";
import { getGuards } from "../../../../packages/reflected/src/guards.js";
import type { CanActivate } from "../../../../packages/reflected/src/guards.js";
import { getInterceptors } from "../../../../packages/reflected/src/interceptors.js";
import type { Interceptor, CallHandler } from "../../../../packages/reflected/src/interceptors.js";
import type {
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "../../../../packages/reflected/src/lifecycle.js";

export interface ControllerOptions {
  controllers?: any[];
  prefix?: string;
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
    getHandler: () => (ControllerClass.prototype as Record<string, unknown>)[handlerName],
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

        fastify.route({
          method: route.method,
          url: fullPath,
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
            const httpCode = getHttpCode(Controller, route.handler);
            if (httpCode !== undefined) {
              void reply.status(httpCode);
            }

            return result;
          },
          ...route.options,
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
