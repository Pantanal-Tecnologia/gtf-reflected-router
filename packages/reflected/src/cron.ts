import "reflect-metadata";
import { CRON_JOBS_METADATA_KEY } from "./metadata-keys";
import type { CronJobExecution, CronJobMetadata, CronJobOptions } from "./types";

export type { CronJobExecution, CronJobMetadata, CronJobOptions };

export const CRON_PATTERNS = {
  EVERY_MINUTE: "* * * * *",
  EVERY_5_MINUTES: "*/5 * * * *",
  EVERY_15_MINUTES: "*/15 * * * *",
  EVERY_30_MINUTES: "*/30 * * * *",
  EVERY_HOUR: "0 * * * *",
  EVERY_2_HOURS: "0 */2 * * *",
  EVERY_6_HOURS: "0 */6 * * *",
  EVERY_12_HOURS: "0 */12 * * *",
  DAILY_MIDNIGHT: "0 0 * * *",
  DAILY_NOON: "0 12 * * *",
  WEEKLY_SUNDAY: "0 0 * * 0",
  WEEKLY_MONDAY: "0 0 * * 1",
  MONTHLY_FIRST_DAY: "0 0 1 * *",
  YEARLY_JANUARY_FIRST: "0 0 1 1 *",
} as const;

function isValidCronPart(part: string, min: number, max: number): boolean {
  if (part === "*" || part === "?") return true;
  if (part.includes("-") && !part.includes("/")) {
    const [rawStart, rawEnd] = part.split("-");
    const start = Number(rawStart);
    const end = Number(rawEnd);
    if (isNaN(start) || isNaN(end)) return false;
    return start >= min && end <= max && start <= end;
  }

  if (part.includes("/")) {
    const slashIdx = part.indexOf("/");
    const range = part.slice(0, slashIdx);
    const step = Number(part.slice(slashIdx + 1));
    if (isNaN(step) || step <= 0) return false;

    if (range === "*") return true;

    if (range.includes("-")) {
      const [rawStart, rawEnd] = range.split("-");
      const start = Number(rawStart);
      const end = Number(rawEnd);
      if (isNaN(start) || isNaN(end)) return false;
      return start >= min && end <= max && start <= end;
    }

    const rangeNum = Number(range);
    return !isNaN(rangeNum) && rangeNum >= min && rangeNum <= max;
  }

  if (part.includes(",")) {
    return part
      .split(",")
      .map(Number)
      .every((val) => !isNaN(val) && val >= min && val <= max);
  }

  // Número simples
  const value = Number(part);
  return !isNaN(value) && value >= min && value <= max;
}

export function validateCronExpression(expression: string): void {
  if (!expression || typeof expression !== "string") {
    throw new Error("@CronJob: expressão cron é obrigatória e deve ser uma string");
  }

  const parts = expression.trim().split(/\s+/);

  if (parts.length < 5 || parts.length > 6) {
    throw new Error(
      `@CronJob: expressão "${expression}" inválida — esperava 5 ou 6 partes, recebeu ${String(parts.length)}`,
    );
  }

  const validators = [
    { name: "minuto", min: 0, max: 59 },
    { name: "hora", min: 0, max: 23 },
    { name: "dia", min: 1, max: 31 },
    { name: "mês", min: 1, max: 12 },
    { name: "dia-da-semana", min: 0, max: 7 }, // 0 e 7 são ambos domingo
  ];

  if (parts.length === 6) {
    validators.unshift({ name: "segundo", min: 0, max: 59 });
  }

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    const validator = validators[i]!;
    if (!isValidCronPart(part, validator.min, validator.max)) {
      throw new Error(
        `@CronJob: parte "${part}" inválida para ${validator.name} (esperado ${String(validator.min)}–${String(validator.max)})`,
      );
    }
  }
}

export function validateCronJobOptions(options?: CronJobOptions): void {
  if (!options) return;

  if (options.maxConcurrency !== undefined) {
    if (!Number.isInteger(options.maxConcurrency) || options.maxConcurrency < 1) {
      throw new Error("@CronJob: maxConcurrency deve ser um inteiro maior que 0");
    }
  }
  if (options.timeout !== undefined) {
    if (!Number.isInteger(options.timeout) || options.timeout < 1) {
      throw new Error("@CronJob: timeout deve ser um inteiro maior que 0 (ms)");
    }
  }
  if (options.priority !== undefined) {
    if (!Number.isInteger(options.priority) || options.priority < 1 || options.priority > 10) {
      throw new Error("@CronJob: priority deve ser um inteiro entre 1 e 10");
    }
  }
  if (options.retryAttempts !== undefined) {
    if (!Number.isInteger(options.retryAttempts) || options.retryAttempts < 0) {
      throw new Error("@CronJob: retryAttempts deve ser um inteiro maior ou igual a 0");
    }
  }
  if (options.retryDelay !== undefined) {
    if (!Number.isInteger(options.retryDelay) || options.retryDelay < 0) {
      throw new Error("@CronJob: retryDelay deve ser um inteiro maior ou igual a 0 (ms)");
    }
  }
}

export function CronJob(expression: string, options?: CronJobOptions): MethodDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    validateCronExpression(expression);
    validateCronJobOptions(options);

    const jobName = typeof propertyKey === "string" ? propertyKey : propertyKey.toString();

    const existingJobs: CronJobMetadata[] =
      (Reflect.getMetadata(CRON_JOBS_METADATA_KEY, target.constructor) as
        | CronJobMetadata[]
        | undefined) ?? [];

    if (existingJobs.some((job) => job.name === jobName)) {
      throw new Error(
        `@CronJob: tarefa "${jobName}" já está registrada em ${(target.constructor as { name?: string }).name ?? "classe desconhecida"}`,
      );
    }

    const resolvedOptions: CronJobOptions = {
      enabled: true,
      maxConcurrency: 1,
      priority: 5,
      retryAttempts: 0,
      retryDelay: 1_000,
      runOnInit: false,
      ...options,
    };

    const newJob: CronJobMetadata = {
      expression,
      name: jobName,
      handler: jobName,
      options: resolvedOptions,
    };

    Reflect.defineMetadata(CRON_JOBS_METADATA_KEY, [...existingJobs, newJob], target.constructor);
  };
}

export function getCronJobs(target: object): CronJobMetadata[] {
  return (
    (Reflect.getMetadata(CRON_JOBS_METADATA_KEY, target) as CronJobMetadata[] | undefined) ?? []
  );
}

export function getCronJob(target: object, jobName: string): CronJobMetadata | undefined {
  return getCronJobs(target).find((job) => job.name === jobName);
}

export function hasCronJobs(target: object): boolean {
  return getCronJobs(target).length > 0;
}

export function getActiveCronJobs(target: object): CronJobMetadata[] {
  return getCronJobs(target).filter((job) => job.options?.enabled !== false);
}

export async function executeCronJobSafely(
  jobMetadata: CronJobMetadata,
  instance: Record<string, unknown>,
  execution: CronJobExecution,
): Promise<unknown> {
  const { options } = jobMetadata;
  const handler = instance[jobMetadata.handler];

  if (typeof handler !== "function") {
    throw new Error(
      `@CronJob: handler "${jobMetadata.handler}" não é uma função na instância fornecida`,
    );
  }

  const maxAttempts = (options?.retryAttempts ?? 0) + 1;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    execution.attempt = attempt;

    try {
      options?.onStart?.(jobMetadata.name);

      const result: unknown = options?.timeout
        ? await Promise.race([
            (handler as () => Promise<unknown>).call(instance),
            new Promise<never>((_, reject) =>
              setTimeout(() => {
                reject(new Error(`Timeout após ${String(options.timeout)}ms`));
              }, options.timeout),
            ),
          ])
        : await (handler as () => Promise<unknown>).call(instance);

      execution.status = "completed";
      execution.result = result;
      execution.endTime = new Date();

      options?.onComplete?.(jobMetadata.name, result);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      execution.error = lastError;

      const isTimeout = lastError.message.startsWith("Timeout");
      const hasMoreAttempts = attempt < maxAttempts;

      if (!isTimeout && hasMoreAttempts) {
        if (options?.retryDelay) {
          await new Promise<void>((resolve) => setTimeout(resolve, options.retryDelay));
        }
        continue;
      }

      execution.status = isTimeout ? "timeout" : "failed";
      execution.endTime = new Date();
      options?.onError?.(jobMetadata.name, lastError);
      throw lastError;
    }
  }

  throw lastError ?? new Error("Falha inesperada na execução do cron job");
}
