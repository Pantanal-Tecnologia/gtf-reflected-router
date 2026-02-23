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
