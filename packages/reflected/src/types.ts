import type { RouteOptions } from "fastify";

export const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  PATCH: "PATCH",
  HEAD: "HEAD",
  OPTIONS: "OPTIONS",
} as const;

export type HttpMethod = (typeof HTTP_METHODS)[keyof typeof HTTP_METHODS];

export interface RouteMetadata {
  method: HttpMethod;
  path: string;
  handler: string;
  options?: Omit<RouteOptions, "method" | "url" | "handler">;
}

export enum ParamType {
  BODY = "body",
  QUERY = "query",
  PARAM = "param",
  HEADERS = "headers",
  REQUEST = "request",
  REPLY = "reply",
}

export interface ZodLike {
  safeParse(
    data: unknown,
  ): { success: true; data: unknown } | { success: false; error: { flatten(): unknown } };
}

export interface ParamMetadata {
  index: number;
  type: ParamType;
  key?: string;
  schema?: ZodLike;
}

export interface HttpArgumentsHost {
  getRequest<T = any>(): T;
  getReply<T = any>(): T;
}

export interface ExecutionContext {
  switchToHttp(): HttpArgumentsHost;
  getHandler(): Function;
  getClass(): Function;
}

export type CustomParamFactory<TData = any, TResult = any> = (
  data: TData,
  ctx: ExecutionContext,
) => TResult | Promise<TResult>;

export interface CustomParamMetadata<TData = any, TResult = any> {
  index: number;
  factory: CustomParamFactory<TData, TResult>;
  data?: TData;
}

export interface CronJobOptions {
  timezone?: string;
  runOnInit?: boolean;
  description?: string;
  enabled?: boolean;
  maxConcurrency?: number;
  timeout?: number;
  onStart?: (jobName: string) => void;
  onComplete?: (jobName: string, result?: unknown) => void;
  onError?: (jobName: string, error: Error) => void;
  priority?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface CronJobMetadata {
  expression: string;
  name: string;
  handler: string;
  options?: CronJobOptions;
}

export interface CronJobExecution {
  jobName: string;
  startTime: Date;
  endTime?: Date;
  status: "running" | "completed" | "failed" | "timeout";
  error?: Error;
  result?: unknown;
  attempt: number;
}
