import "reflect-metadata";
import type { RouteOptions } from "fastify";
import {
  CONTROLLER_PREFIX_METADATA_KEY,
  REQUEST_PARAM_METADATA_KEY,
  RESPONSE_PARAM_METADATA_KEY,
  ROUTES_METADATA_KEY,
  HTTP_CODE_METADATA_KEY,
  API_RESPONSE_METADATA_KEY,
} from "./metadata-keys";
import { HTTP_METHODS } from "./types";
import type { HttpMethod, RouteMetadata } from "./types";
import { Container } from "./container";
import { registry } from "./registry";

export type { HttpMethod, RouteMetadata };
export { HTTP_METHODS };

function isValidHttpMethod(method: string): method is HttpMethod {
  return (Object.values(HTTP_METHODS) as string[]).includes(method);
}

function resolveKey(propertyKey: string | symbol): string {
  return typeof propertyKey === "string" ? propertyKey : propertyKey.toString();
}

export function Controller(prefix = ""): (target: object) => void {
  if (prefix && !prefix.startsWith("/")) {
    throw new Error(`@Controller: o prefixo deve começar com "/" (recebido: "${prefix}")`);
  }
  return (target: object): void => {
    Reflect.defineMetadata(CONTROLLER_PREFIX_METADATA_KEY, prefix, target);
    Container.register(target as new (...args: any[]) => any, { scope: "singleton" });
    registry.register(target as new (...args: any[]) => any);
  };
}

export function getControllerPrefix(target: object): string {
  return (Reflect.getMetadata(CONTROLLER_PREFIX_METADATA_KEY, target) as string | undefined) ?? "";
}

export function Route(
  method: string,
  path: string,
  options?: Omit<RouteOptions, "method" | "url" | "handler">,
): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor): void => {
    if (!method || typeof method !== "string") {
      throw new Error("@Route: método HTTP é obrigatório e deve ser uma string");
    }
    if (!isValidHttpMethod(method.toUpperCase())) {
      throw new Error(`@Route: método HTTP "${method}" não é suportado`);
    }
    if (typeof path !== "string" || !path.startsWith("/")) {
      throw new Error(`@Route: o caminho deve começar com "/" (recebido: "${path}")`);
    }
    if (typeof descriptor.value !== "function") {
      throw new Error("@Route só pode ser usado em métodos");
    }

    const existingRoutes: RouteMetadata[] =
      (Reflect.getMetadata(ROUTES_METADATA_KEY, target.constructor) as
        | RouteMetadata[]
        | undefined) ?? [];

    const normalizedMethod = method.toUpperCase() as HttpMethod;

    if (existingRoutes.some((r) => r.method === normalizedMethod && r.path === path)) {
      throw new Error(`@Route: rota ${normalizedMethod} ${path} já está registrada`);
    }

    const newRoute: RouteMetadata = {
      method: normalizedMethod,
      path,
      handler: resolveKey(propertyKey),
      options,
    };

    Reflect.defineMetadata(ROUTES_METADATA_KEY, [...existingRoutes, newRoute], target.constructor);
  };
}

export const Get = (
  path: string,
  options?: Omit<RouteOptions, "method" | "url" | "handler">,
): MethodDecorator => Route(HTTP_METHODS.GET, path, options);
export const Post = (
  path: string,
  options?: Omit<RouteOptions, "method" | "url" | "handler">,
): MethodDecorator => Route(HTTP_METHODS.POST, path, options);

export const Put = (
  path: string,
  options?: Omit<RouteOptions, "method" | "url" | "handler">,
): MethodDecorator => Route(HTTP_METHODS.PUT, path, options);
export const Delete = (
  path: string,
  options?: Omit<RouteOptions, "method" | "url" | "handler">,
): MethodDecorator => Route(HTTP_METHODS.DELETE, path, options);
export const Patch = (
  path: string,
  options?: Omit<RouteOptions, "method" | "url" | "handler">,
): MethodDecorator => Route(HTTP_METHODS.PATCH, path, options);

export const Head = (
  path: string,
  options?: Omit<RouteOptions, "method" | "url" | "handler">,
): MethodDecorator => Route(HTTP_METHODS.HEAD, path, options);

export const Options = (
  path: string,
  options?: Omit<RouteOptions, "method" | "url" | "handler">,
): MethodDecorator => Route(HTTP_METHODS.OPTIONS, path, options);

/**
 * @deprecated Use `@Req()` from `gtf-reflected-router/params` instead.
 */
export function Request(): ParameterDecorator {
  return (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ): void => {
    if (propertyKey === undefined) return;
    const existing: number[] =
      Reflect.getOwnMetadata(REQUEST_PARAM_METADATA_KEY, target.constructor, propertyKey) ?? [];
    Reflect.defineMetadata(
      REQUEST_PARAM_METADATA_KEY,
      [...existing, parameterIndex],
      target.constructor,
      propertyKey,
    );
  };
}

/**
 * @deprecated Use `@Res()` from `gtf-reflected-router/params` instead.
 */
export function Response(): ParameterDecorator {
  return (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ): void => {
    if (propertyKey === undefined) return;
    const existing: number[] =
      Reflect.getOwnMetadata(RESPONSE_PARAM_METADATA_KEY, target.constructor, propertyKey) ?? [];
    Reflect.defineMetadata(
      RESPONSE_PARAM_METADATA_KEY,
      [...existing, parameterIndex],
      target.constructor,
      propertyKey,
    );
  };
}

export function getRoutes(target: object): RouteMetadata[] {
  return (Reflect.getMetadata(ROUTES_METADATA_KEY, target) as RouteMetadata[] | undefined) ?? [];
}

export function getRequestParams(target: object, propertyKey: string | symbol): number[] {
  return (
    (Reflect.getOwnMetadata(REQUEST_PARAM_METADATA_KEY, target.constructor, propertyKey) as
      | number[]
      | undefined) ?? []
  );
}

export function getResponseParams(target: object, propertyKey: string | symbol): number[] {
  return (
    (Reflect.getOwnMetadata(RESPONSE_PARAM_METADATA_KEY, target.constructor, propertyKey) as
      | number[]
      | undefined) ?? []
  );
}

export function HttpCode(statusCode: number): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(
      HTTP_CODE_METADATA_KEY,
      statusCode,
      (target as any).constructor,
      propertyKey,
    );
  };
}

export function getHttpCode(target: object, propertyKey: string | symbol): number | undefined {
  return Reflect.getMetadata(HTTP_CODE_METADATA_KEY, target, propertyKey) as number | undefined;
}

export interface ApiResponseOptions {
  statusCode?: number;
  description?: string;
  isArray?: boolean;
}

export interface ApiResponseMetadata {
  schema: import("./types").ZodLike;
  statusCode?: number;
  description?: string;
  isArray?: boolean;
}

export function ApiResponse(
  schema: import("./types").ZodLike,
  options: ApiResponseOptions = {},
): MethodDecorator {
  return (target, propertyKey): void => {
    const metadata: ApiResponseMetadata = { schema, ...options };
    Reflect.defineMetadata(
      API_RESPONSE_METADATA_KEY,
      metadata,
      (target as any).constructor,
      propertyKey,
    );
  };
}

export function getApiResponse(
  target: object,
  propertyKey: string | symbol,
): ApiResponseMetadata | undefined {
  return Reflect.getMetadata(API_RESPONSE_METADATA_KEY, target, propertyKey) as
    | ApiResponseMetadata
    | undefined;
}
