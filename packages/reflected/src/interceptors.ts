import "reflect-metadata";
import { INTERCEPTORS_METADATA_KEY } from "./metadata-keys";
import type { ExecutionContext } from "./types";

export interface CallHandler {
  handle(): Promise<unknown>;
}

export interface Interceptor {
  intercept(context: ExecutionContext, next: CallHandler): Promise<unknown>;
}

type Constructor<T = any> = new (...args: any[]) => T;

export function UseInterceptors(
  ...interceptors: (Constructor<Interceptor> | Interceptor)[]
): ClassDecorator & MethodDecorator {
  const decorator = (target: any, propertyKey?: string | symbol) => {
    if (propertyKey !== undefined) {
      Reflect.defineMetadata(
        INTERCEPTORS_METADATA_KEY,
        interceptors,
        target.constructor,
        propertyKey,
      );
    } else {
      Reflect.defineMetadata(INTERCEPTORS_METADATA_KEY, interceptors, target);
    }
  };
  return decorator as ClassDecorator & MethodDecorator;
}

export function getInterceptors(
  target: object,
  propertyKey?: string | symbol,
): (Constructor<Interceptor> | Interceptor)[] {
  const classInterceptors: (Constructor<Interceptor> | Interceptor)[] =
    Reflect.getMetadata(INTERCEPTORS_METADATA_KEY, target) ?? [];
  const methodInterceptors: (Constructor<Interceptor> | Interceptor)[] = propertyKey
    ? (Reflect.getMetadata(INTERCEPTORS_METADATA_KEY, target, propertyKey) ?? [])
    : [];
  return [...classInterceptors, ...methodInterceptors];
}
