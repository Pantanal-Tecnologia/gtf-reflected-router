import "reflect-metadata";
import { GUARDS_METADATA_KEY } from "./metadata-keys.js";
import type { ExecutionContext } from "./types.js";

export interface CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}

type Constructor<T = any> = new (...args: any[]) => T;

export function UseGuards(
  ...guards: (Constructor<CanActivate> | CanActivate)[]
): ClassDecorator & MethodDecorator {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (propertyKey !== undefined) {
      Reflect.defineMetadata(GUARDS_METADATA_KEY, guards, target.constructor, propertyKey);
    } else {
      Reflect.defineMetadata(GUARDS_METADATA_KEY, guards, target);
    }
    return descriptor;
  };
}

export function getGuards(
  target: object,
  propertyKey?: string | symbol,
): (Constructor<CanActivate> | CanActivate)[] {
  const classGuards: (Constructor<CanActivate> | CanActivate)[] =
    Reflect.getMetadata(GUARDS_METADATA_KEY, target) ?? [];
  const methodGuards: (Constructor<CanActivate> | CanActivate)[] = propertyKey
    ? (Reflect.getMetadata(GUARDS_METADATA_KEY, target, propertyKey) ?? [])
    : [];
  return [...classGuards, ...methodGuards];
}
