import type {  FastifyPluginOptions } from 'fastify';
import 'reflect-metadata';

/**
 * Metadata interface for Fastify plugins
 */
export interface PluginMetadata {
  options?: FastifyPluginOptions;
}

/**
 * Metadata interface for plugin hooks
 */
export interface HookMetadata {
  hookName: string;
  handler: string;
}

// Metadata keys
const PLUGIN_METADATA_KEY = Symbol('plugin');
const BEFORE_REQUEST_HOOK_KEY = Symbol('before-request');
const AFTER_REQUEST_HOOK_KEY = Symbol('after-request');

/**
 * Decorator for marking a class as a Fastify plugin
 * @param options - Plugin options
 * @returns Class decorator
 * @example
 * @Plugin()
 * export class LogUser {
 *   // Plugin methods
 * }
 */
export function Plugin(options?: FastifyPluginOptions): ClassDecorator {
  return function (target: Function): void {
    Reflect.defineMetadata(PLUGIN_METADATA_KEY, { options }, target);
  };
}

/**
 * Decorator for methods that should run before a request is processed
 * @returns Method decorator
 * @example
 * @Plugin()
 * export class LogUser {
 *   @BeforeRequest()
 *   async logRequest(request, reply) {
 *     console.log(`Request received: ${request.method} ${request.url}`);
 *   }
 * }
 */
export function BeforeRequest(): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): void {
    if (typeof descriptor.value !== 'function') {
      throw new Error('Decorator @BeforeRequest só pode ser usado em métodos');
    }

    const existingHooks: HookMetadata[] = Reflect.getMetadata(
      BEFORE_REQUEST_HOOK_KEY,
      target.constructor,
    ) || [];

    const newHook: HookMetadata = {
      hookName: 'onRequest',
      handler: typeof propertyKey === 'string' ? propertyKey : propertyKey.toString(),
    };

    existingHooks.push(newHook);
    Reflect.defineMetadata(BEFORE_REQUEST_HOOK_KEY, existingHooks, target.constructor);
  };
}

/**
 * Decorator for methods that should run after a request is processed
 * @returns Method decorator
 * @example
 * @Plugin()
 * export class LogUser {
 *   @AfterRequest()
 *   async logResponse(request, reply) {
 *     console.log(`Response sent with status: ${reply.statusCode}`);
 *   }
 * }
 */
export function AfterRequest(): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): void {
    if (typeof descriptor.value !== 'function') {
      throw new Error('Decorator @AfterRequest só pode ser usado em métodos');
    }

    const existingHooks: HookMetadata[] = Reflect.getMetadata(
      AFTER_REQUEST_HOOK_KEY,
      target.constructor,
    ) || [];

    const newHook: HookMetadata = {
      hookName: 'onResponse',
      handler: typeof propertyKey === 'string' ? propertyKey : propertyKey.toString(),
    };

    existingHooks.push(newHook);
    Reflect.defineMetadata(AFTER_REQUEST_HOOK_KEY, existingHooks, target.constructor);
  };
}

/**
 * Checks if a class is a Fastify plugin
 * @param target - The class to check
 * @returns True if the class is a plugin
 */
export function isPlugin(target: Function): boolean {
  return Reflect.hasMetadata(PLUGIN_METADATA_KEY, target);
}

/**
 * Gets plugin metadata from a class
 * @param target - The plugin class
 * @returns Plugin metadata
 */
export function getPluginMetadata(target: Function): PluginMetadata | undefined {
  return Reflect.getMetadata(PLUGIN_METADATA_KEY, target) as PluginMetadata | undefined;
}

/**
 * Gets before request hooks from a plugin class
 * @param target - The plugin class
 * @returns Array of hook metadata
 */
export function getBeforeRequestHooks(target: Function): HookMetadata[] {
  return Reflect.getMetadata(BEFORE_REQUEST_HOOK_KEY, target) as HookMetadata[] || [];
}

/**
 * Gets after request hooks from a plugin class
 * @param target - The plugin class
 * @returns Array of hook metadata
 */
export function getAfterRequestHooks(target: Function): HookMetadata[] {
  return Reflect.getMetadata(AFTER_REQUEST_HOOK_KEY, target) as HookMetadata[] || [];
}