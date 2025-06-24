import type { RouteOptions } from 'fastify';
import 'reflect-metadata';

/**
 * Constantes para métodos HTTP suportados
 */
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS',
} as const;

export type HttpMethod = (typeof HTTP_METHODS)[keyof typeof HTTP_METHODS];

export interface RouteMetadata {
  method: HttpMethod;
  path: string;
  handler: string;
  options?: Omit<RouteOptions, 'method' | 'url' | 'handler'>;
}

const ROUTES_METADATA_KEY = Symbol('routes');

function isValidHttpMethod(method: string): method is HttpMethod {
  return (Object.values(HTTP_METHODS) as string[]).includes(method);
}

/**
 * Decorator principal para definir rotas
 * @param method - Método HTTP (GET, POST, PUT, DELETE, PATCH, etc.)
 * @param path - Caminho da rota
 * @param options - Opções adicionais da rota do Fastify
 */
export function Route(
  method: string,
  path: string,
  options?: Omit<RouteOptions, 'method' | 'url' | 'handler'>,
): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): void {
    if (!method || typeof method !== 'string') {
      throw new Error('Método HTTP é obrigatório e deve ser uma string');
    }

    if (!isValidHttpMethod(method.toUpperCase())) {
      throw new Error(`Método HTTP '${method}' não é suportado`);
    }

    if (typeof path !== 'string') {
      throw new Error('Caminho da rota é obrigatório e deve ser uma string');
    }

    if (!path.startsWith('/')) {
      throw new Error('Caminho da rota deve começar com "/"');
    }

    if (typeof descriptor.value !== 'function') {
      throw new Error('Decorator @Route só pode ser usado em métodos');
    }

    try {
      const metadata = Reflect.getMetadata(
        ROUTES_METADATA_KEY,
        target.constructor,
      ) as RouteMetadata[] | undefined;

      const existingRoutes: RouteMetadata[] = metadata ?? [];

      const duplicateRoute = existingRoutes.find(
        (route: RouteMetadata) =>
          route.method === method.toUpperCase() && route.path === path,
      );

      if (duplicateRoute) {
        throw new Error(
          `Rota ${method.toUpperCase()} ${path} já está definida`,
        );
      }

      const newRoute: RouteMetadata = {
        method: method.toUpperCase() as HttpMethod,
        path,
        handler:
          typeof propertyKey === 'string'
            ? propertyKey
            : propertyKey.toString(),
        options,
      };

      const routes: RouteMetadata[] = [...existingRoutes, newRoute];

      Reflect.defineMetadata(ROUTES_METADATA_KEY, routes, target.constructor);
    } catch (error) {
      throw new Error(
        `Erro ao definir rota: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      );
    }
  };
}

export const Get = (
  path: string,
  options?: Omit<RouteOptions, 'method' | 'url' | 'handler'>,
): MethodDecorator => Route(HTTP_METHODS.GET, path, options);

export const Post = (
  path: string,
  options?: Omit<RouteOptions, 'method' | 'url' | 'handler'>,
): MethodDecorator => Route(HTTP_METHODS.POST, path, options);

export const Put = (
  path: string,
  options?: Omit<RouteOptions, 'method' | 'url' | 'handler'>,
): MethodDecorator => Route(HTTP_METHODS.PUT, path, options);

export const Delete = (
  path: string,
  options?: Omit<RouteOptions, 'method' | 'url' | 'handler'>,
): MethodDecorator => Route(HTTP_METHODS.DELETE, path, options);

export const Patch = (
  path: string,
  options?: Omit<RouteOptions, 'method' | 'url' | 'handler'>,
): MethodDecorator => Route(HTTP_METHODS.PATCH, path, options);

export const Head = (
  path: string,
  options?: Omit<RouteOptions, 'method' | 'url' | 'handler'>,
): MethodDecorator => Route(HTTP_METHODS.HEAD, path, options);

export const Options = (
  path: string,
  options?: Omit<RouteOptions, 'method' | 'url' | 'handler'>,
): MethodDecorator => Route(HTTP_METHODS.OPTIONS, path, options);

export function getRoutes(target: object): RouteMetadata[] {
  const metadata = Reflect.getMetadata(ROUTES_METADATA_KEY, target) as
    | RouteMetadata[]
    | undefined;

  return metadata ?? [];
}
