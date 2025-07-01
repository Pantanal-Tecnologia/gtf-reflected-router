import "reflect-metadata";


export interface CronJobMetadata {
  expression: string;
  name: string;
  handler: string;
  options?: CronJobOptions;
}

export interface CronJobOptions {
  timezone?: string;
  
  /**
   * Se a tarefa deve ser executada imediatamente após o registro
   * @default false
   */
  runOnInit?: boolean;
  
  /**
   * Descrição da tarefa
   */
  description?: string;
  
  /**
   * Se a tarefa está ativa
   * @default true
   */
  enabled?: boolean;
  
  /**
   * Número máximo de execuções simultâneas
   * @default 1
   */
  maxConcurrency?: number;
  
  /**
   * Timeout para execução da tarefa em milissegundos
   * @default undefined (sem timeout)
   */
  timeout?: number;
  
  /**
   * Callback executado quando a tarefa inicia
   */
  onStart?: (jobName: string) => void;
  
  /**
   * Callback executado quando a tarefa termina com sucesso
   */
  onComplete?: (jobName: string, result?: any) => void;
  
  /**
   * Callback executado quando a tarefa falha
   */
  onError?: (jobName: string, error: Error) => void;
  
  /**
   * Prioridade da tarefa (1 = alta, 10 = baixa)
   * @default 5
   */
  priority?: number;
  
  /**
   * Tentativas de retry em caso de falha
   * @default 0
   */
  retryAttempts?: number;
  
  /**
   * Delay entre tentativas de retry em milissegundos
   * @default 1000
   */
  retryDelay?: number;
}

/**
 * Interface para informações de execução da tarefa
 */
export interface CronJobExecution {
  jobName: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  error?: Error;
  result?: any;
  attempt: number;
}

// Chave de metadados para tarefas cron
const CRON_JOBS_METADATA_KEY = Symbol("cron-jobs");


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

/**
 * Valida uma expressão cron de forma mais robusta
 * @param expression - Expressão cron a ser validada
 * @throws Error se a expressão for inválida
 */
function validateCronExpression(expression: string): void {
  if (!expression || typeof expression !== "string") {
    throw new Error("Expressão cron é obrigatória e deve ser uma string");
  }
  
  const cleanExpression = expression.trim();
  if (!cleanExpression) {
    throw new Error("Expressão cron não pode estar vazia");
  }
  
  const parts = cleanExpression.split(/\s+/);
  if (parts.length < 5 || parts.length > 6) {
    throw new Error(
        `Expressão cron '${expression}' é inválida. Deve ter 5 ou 6 partes (minuto hora dia mês dia-da-semana [segundo]).`
    );
  }
  
  const validators = [
    { name: "minuto", min: 0, max: 59 },
    { name: "hora", min: 0, max: 23 },
    { name: "dia", min: 1, max: 31 },
    { name: "mês", min: 1, max: 12 },
    { name: "dia-da-semana", min: 0, max: 7 }, // 0 e 7 são domingo
  ];
  
  if (parts.length === 6) {
    validators.unshift({ name: "segundo", min: 0, max: 59 });
  }
  
  parts.forEach((part, index) => {
    const validator = validators[index];
    
    if(!validator) {
      throw new Error('Invalid validator')
    }
    
    if (!isValidCronPart(part, validator.min, validator.max)) {
      throw new Error(
          `Parte '${part}' da expressão cron é inválida para ${validator.name} (deve estar entre ${validator.min}-${validator.max})`
      );
    }
  });
}

/**
 * Valida uma parte individual da expressão cron
 */
function isValidCronPart(part: string, min: number, max: number): boolean {
  if (part === "*") return true;
  
  if (part === "?") return true;
  
  if (part.includes("-")) {
    const [start, end] = part.split("-").map(Number);
    
    if(!start || !end) return false;
    
    return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end;
  }
  
  if (part.includes("/")) {
    const [range, step] = part.split("/");
    const stepNum = Number(step);
    if (isNaN(stepNum) || stepNum <= 0) return false;
    
    if(!range) return false;
    if (range === "*") return true;
    
    if (range.includes("-")) {
      const [start, end] = range.split("-").map(Number);
      
      if(!start || !end) return false;
      
      return !isNaN(Number(Number)) && !isNaN(Number(end)) && start >= min && end <= max;
    }
    const rangeNum = Number(range);
    return !isNaN(rangeNum) && rangeNum >= min && rangeNum <= max;
  }
  
  if (part.includes(",")) {
    const values = part.split(",").map(Number);
    return values.every(val => !isNaN(val) && val >= min && val <= max);
  }
  
  const value = Number(part);
  return !isNaN(value) && value >= min && value <= max;
}

/**
 * Valida as opções do cron job
 */
function validateCronJobOptions(options?: CronJobOptions): void {
  if (!options) return;
  
  if (options.maxConcurrency !== undefined) {
    if (typeof options.maxConcurrency !== "number" || options.maxConcurrency < 1) {
      throw new Error("maxConcurrency deve ser um número maior que 0");
    }
  }
  
  if (options.timeout !== undefined) {
    if (typeof options.timeout !== "number" || options.timeout < 1) {
      throw new Error("timeout deve ser um número maior que 0");
    }
  }
  
  if (options.priority !== undefined) {
    if (typeof options.priority !== "number" || options.priority < 1 || options.priority > 10) {
      throw new Error("priority deve ser um número entre 1 e 10");
    }
  }
  
  if (options.retryAttempts !== undefined) {
    if (typeof options.retryAttempts !== "number" || options.retryAttempts < 0) {
      throw new Error("retryAttempts deve ser um número maior ou igual a 0");
    }
  }
  
  if (options.retryDelay !== undefined) {
    if (typeof options.retryDelay !== "number" || options.retryDelay < 0) {
      throw new Error("retryDelay deve ser um número maior ou igual a 0");
    }
  }
}

/**
 * Decorator para definir uma tarefa cron com funcionalidades avançadas
 * @param expression - Expressão cron (formato: "* * * * *" ou "* * * * * *") ou uma das constantes CRON_PATTERNS
 * @param options - Opções adicionais para a tarefa cron
 * @returns Decorator de método
 * @example
 * class TasksController {
 *   @CronJob(CRON_PATTERNS.DAILY_MIDNIGHT, {
 *     timezone: "America/Sao_Paulo",
 *     description: "Tarefa diária à meia-noite",
 *     maxConcurrency: 1,
 *     timeout: 30000,
 *     retryAttempts: 3,
 *     onError: (jobName, error) => console.error(`Erro na tarefa ${jobName}:`, error)
 *   })
 *   async dailyTask() {
 *     // Código a ser executado diariamente à meia-noite
 *   }
 *
**/

export function CronJob(
    expression: string,
    options?: CronJobOptions
): MethodDecorator {
  return function (
      target: object,
      propertyKey: string | symbol,
      descriptor: PropertyDescriptor
  ): void {
    validateCronExpression(expression);
    validateCronJobOptions(options);
    
    if (typeof descriptor.value !== "function") {
      throw new Error("Decorator @CronJob só pode ser usado em métodos");
    }
    
    try {
      const metadata = Reflect.getMetadata(
          CRON_JOBS_METADATA_KEY,
          target.constructor
      ) as CronJobMetadata[] | undefined;
      
      const existingJobs: CronJobMetadata[] = metadata ?? [];
      
      const jobName = typeof propertyKey === "string"
          ? propertyKey
          : propertyKey.toString();
      
      const duplicateJob = existingJobs.find(
          (job: CronJobMetadata) => job.name === jobName
      );
      
      if (duplicateJob) {
        throw new Error(
            `Tarefa cron com nome '${jobName}' já está definida na classe ${target.constructor.name}`
        );
      }
      
      const finalOptions: CronJobOptions = {
        enabled: true,
        maxConcurrency: 1,
        priority: 5,
        retryAttempts: 0,
        retryDelay: 1000,
        runOnInit: false,
        ...options,
      };
      
      const newJob: CronJobMetadata = {
        expression,
        name: jobName,
        handler: jobName,
        options: finalOptions,
      };
      
      const jobs: CronJobMetadata[] = [...existingJobs, newJob];
      
      Reflect.defineMetadata(CRON_JOBS_METADATA_KEY, jobs, target.constructor);
      
      if (process.env.NODE_ENV === "development") {
        console.log(`[CronJob] Registrada tarefa '${jobName}' com expressão '${expression}'`);
      }
    } catch (error) {
      throw new Error(
          `Erro ao definir tarefa cron '${propertyKey.toString()}': ${
              error instanceof Error ? error.message : "Erro desconhecido"
          }`
      );
    }
  };
}

/**
 * Obtém todas as tarefas cron definidas em uma classe
 * @param target - A classe alvo
 * @returns Array de metadados de tarefas cron
 */
export function getCronJobs(target: object): CronJobMetadata[] {
  const metadata = Reflect.getMetadata(CRON_JOBS_METADATA_KEY, target) as
      | CronJobMetadata[]
      | undefined;
  
  return metadata ?? [];
}

/**
 * Obtém uma tarefa cron específica por nome
 * @param target - A classe alvo
 * @param jobName - Nome da tarefa
 * @returns Metadados da tarefa cron ou undefined se não encontrada
 */
export function getCronJob(target: object, jobName: string): CronJobMetadata | undefined {
  const jobs = getCronJobs(target);
  return jobs.find(job => job.name === jobName);
}

/**
 * Verifica se uma classe possui tarefas cron
 * @param target - A classe alvo
 * @returns true se a classe possui tarefas cron
 */
export function hasCronJobs(target: object): boolean {
  return getCronJobs(target).length > 0;
}

/**
 * Obtém todas as tarefas cron ativas de uma classe
 * @param target - A classe alvo
 * @returns Array de metadados de tarefas cron ativas
 */
export function getActiveCronJobs(target: object): CronJobMetadata[] {
  return getCronJobs(target).filter(job => job.options?.enabled !== false);
}

/**
 * Wrapper para execução segura de tarefas cron com retry e timeout
 * @param jobMetadata - Metadados da tarefa
 * @param instance - Instância da classe
 * @param execution - Informações de execução
 * @returns Promise com o resultado da execução
 */
export async function executeCronJobSafely(
    jobMetadata: CronJobMetadata,
    instance: any,
    execution: CronJobExecution
): Promise<any> {
  const { options } = jobMetadata;
  const handler = instance[jobMetadata.handler];
  
  if (typeof handler !== "function") {
    throw new Error(`Handler '${jobMetadata.handler}' não é uma função`);
  }
  
  let result: any;
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= (options?.retryAttempts ?? 0) + 1; attempt++) {
    execution.attempt = attempt;
    
    try {
      options?.onStart?.(jobMetadata.name);
      
      if (options?.timeout) {
        result = await Promise.race([
          handler.call(instance),
          new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), options.timeout)
          )
        ]);
      } else {
        result = await handler.call(instance);
      }
      
      execution.status = 'completed';
      execution.result = result;
      execution.endTime = new Date();
      
      options?.onComplete?.(jobMetadata.name, result);
      
      return result;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      execution.error = lastError;
      
      if (attempt <= (options?.retryAttempts ?? 0)) {
        if (options?.retryDelay) {
          await new Promise(resolve => setTimeout(resolve, options.retryDelay));
        }
        continue;
      }
      
      execution.status = lastError.message === "Timeout" ? 'timeout' : 'failed';
      execution.endTime = new Date();
      
      options?.onError?.(jobMetadata.name, lastError);
      
      throw lastError;
    }
  }
}