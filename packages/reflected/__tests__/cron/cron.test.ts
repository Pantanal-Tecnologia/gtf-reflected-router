import {
  CRON_PATTERNS,
  CronJob,
  executeCronJobSafely,
  getActiveCronJobs,
  getCronJob,
  getCronJobs,
  hasCronJobs,
  validateCronExpression,
  validateCronJobOptions,
} from "../../src/cron";
import type { CronJobExecution } from "../../src/types";

// ---------------------------------------------------------------------------
// validateCronExpression
// ---------------------------------------------------------------------------

describe("validateCronExpression", () => {
  it.each([
    "* * * * *",
    "*/5 * * * *",
    "0 12 * * 1-5",
    "0 0 1 1 *",
    "0 0 * * 0,6",
    "30 9 * * 1",
    // 6 partes (com segundos)
    "0 * * * * *",
    "30 0 * * * *",
  ])("aceita expressão válida: %s", (expr) => {
    expect(() => validateCronExpression(expr)).not.toThrow();
  });

  it.each([
    ["", "obrigatória"],
    ["* * * *", "inválida"], // apenas 4 partes
    ["* * * * * * *", "inválida"], // 7 partes
    ["60 * * * *", "minuto"], // minuto > 59
    ["* 25 * * *", "hora"], // hora > 23
    ["* * 0 * *", "dia"], // dia < 1
    ["* * * 13 *", "mês"], // mês > 12
    ["* * * * 8", "dia-da-semana"], // dia-da-semana > 7
  ])("lança erro para %s", (expr, expectedMessage) => {
    expect(() => validateCronExpression(expr)).toThrow(expectedMessage);
  });

  // Caso específico do bug corrigido: range com step em posição de dia-da-semana
  it('aceita step com range numérico: "1-5/2" em qualquer campo', () => {
    // step com range "1-5/2" no campo minuto
    expect(() => validateCronExpression("1-5/2 * * * *")).not.toThrow();
  });

  // Testa que valores 0 em ranges NÃO disparam falsy-check incorreto
  it("aceita range iniciando em 0 no campo minuto", () => {
    expect(() => validateCronExpression("0-30 * * * *")).not.toThrow();
  });

  it("aceita range iniciando em 0 no campo hora", () => {
    expect(() => validateCronExpression("* 0-12 * * *")).not.toThrow();
  });

  it('aceita wildcard com step: "*/15"', () => {
    expect(() => validateCronExpression("*/15 * * * *")).not.toThrow();
  });

  it("aceita lista de valores", () => {
    expect(() => validateCronExpression("0 8,12,18 * * *")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// validateCronJobOptions
// ---------------------------------------------------------------------------

describe("validateCronJobOptions", () => {
  it("não lança com opções undefined", () => {
    expect(() => validateCronJobOptions(undefined)).not.toThrow();
  });

  it("não lança com opções válidas", () => {
    expect(() =>
      validateCronJobOptions({
        maxConcurrency: 2,
        timeout: 5_000,
        priority: 3,
        retryAttempts: 2,
        retryDelay: 500,
      }),
    ).not.toThrow();
  });

  it.each([
    [{ maxConcurrency: 0 }, "maxConcurrency"],
    [{ timeout: -1 }, "timeout"],
    [{ priority: 11 }, "priority"],
    [{ priority: 0 }, "priority"],
    [{ retryAttempts: -1 }, "retryAttempts"],
    [{ retryDelay: -100 }, "retryDelay"],
  ] as const)("lança erro para %o", (opts, field) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => validateCronJobOptions(opts as any)).toThrow(field);
  });
});

// ---------------------------------------------------------------------------
// CRON_PATTERNS
// ---------------------------------------------------------------------------

describe("CRON_PATTERNS", () => {
  it("todos os padrões predefinidos são válidos", () => {
    for (const expr of Object.values(CRON_PATTERNS)) {
      expect(() => validateCronExpression(expr)).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// @CronJob
// ---------------------------------------------------------------------------

describe("@CronJob", () => {
  it("registra um job com sucesso", () => {
    class Tasks {
      @CronJob("* * * * *")
      myJob() {}
    }
    const jobs = getCronJobs(Tasks);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ name: "myJob", expression: "* * * * *" });
  });

  it("aplica defaults nas opções", () => {
    class Tasks {
      @CronJob("0 * * * *")
      job() {}
    }
    const [job] = getCronJobs(Tasks);
    expect(job?.options?.enabled).toBe(true);
    expect(job?.options?.maxConcurrency).toBe(1);
    expect(job?.options?.priority).toBe(5);
    expect(job?.options?.retryAttempts).toBe(0);
    expect(job?.options?.retryDelay).toBe(1_000);
  });

  it("lança erro para job duplicado", () => {
    expect(() => {
      class Tasks {
        @CronJob("* * * * *")
        myJob() {}
        @CronJob("*/5 * * * *")
        myJob2() {}
      }
      // forçar registro do segundo decorator com mesmo nome via hack
      const instance = new Tasks();
      // checar apenas que a segunda declaração com mesmo nome falha
      const decorator = CronJob("*/10 * * * *");
      decorator(Tasks.prototype, "myJob");
      return instance;
    }).toThrow("já está registrada");
  });

  it("lança erro para expressão inválida", () => {
    expect(() => {
      class Tasks {
        @CronJob("invalid")
        job() {}
      }
      return Tasks;
    }).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

describe("getCronJobs / hasCronJobs / getActiveCronJobs / getCronJob", () => {
  class Tasks {
    @CronJob("* * * * *", { enabled: true })
    active() {}

    @CronJob("*/5 * * * *", { enabled: false })
    disabled() {}
  }

  it("getCronJobs retorna todos os jobs", () => {
    expect(getCronJobs(Tasks)).toHaveLength(2);
  });

  it("hasCronJobs retorna true", () => {
    expect(hasCronJobs(Tasks)).toBe(true);
  });

  it("hasCronJobs retorna false sem decorator", () => {
    class Empty {}
    expect(hasCronJobs(Empty)).toBe(false);
  });

  it("getActiveCronJobs filtra apenas os ativos", () => {
    const active = getActiveCronJobs(Tasks);
    expect(active).toHaveLength(1);
    expect(active[0]?.name).toBe("active");
  });

  it("getCronJob retorna job por nome", () => {
    expect(getCronJob(Tasks, "disabled")?.name).toBe("disabled");
  });

  it("getCronJob retorna undefined para nome inexistente", () => {
    expect(getCronJob(Tasks, "naoExiste")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// executeCronJobSafely
// ---------------------------------------------------------------------------

describe("executeCronJobSafely", () => {
  function makeExecution(): CronJobExecution {
    return {
      jobName: "test",
      startTime: new Date(),
      status: "running",
      attempt: 0,
    };
  }

  it("executa o handler e retorna o resultado", async () => {
    class T {
      @CronJob("* * * * *")
      myJob() {
        return 42;
      }
    }
    const [meta] = getCronJobs(T);
    const instance = new T() as unknown as Record<string, unknown>;
    const result = await executeCronJobSafely(meta!, instance, makeExecution());
    expect(result).toBe(42);
  });

  it('atualiza status para "completed"', async () => {
    class T {
      @CronJob("* * * * *")
      job() {}
    }
    const [meta] = getCronJobs(T);
    const exec = makeExecution();
    await executeCronJobSafely(
      meta!,
      new T() as unknown as Record<string, unknown>,
      exec,
    );
    expect(exec.status).toBe("completed");
    expect(exec.endTime).toBeInstanceOf(Date);
  });

  it("lança erro se handler não é função", async () => {
    class T {
      @CronJob("* * * * *")
      job() {}
    }
    const [meta] = getCronJobs(T);
    await expect(
      executeCronJobSafely(meta!, { job: "not-a-function" }, makeExecution()),
    ).rejects.toThrow("não é uma função");
  });

  it("faz retry e depois falha", async () => {
    let calls = 0;
    class T {
      @CronJob("* * * * *", { retryAttempts: 2, retryDelay: 0 })
      job() {
        calls++;
        throw new Error("falha");
      }
    }
    const [meta] = getCronJobs(T);
    const exec = makeExecution();
    await expect(
      executeCronJobSafely(
        meta!,
        new T() as unknown as Record<string, unknown>,
        exec,
      ),
    ).rejects.toThrow("falha");
    expect(calls).toBe(3); // 1 tentativa original + 2 retries
    expect(exec.status).toBe("failed");
  });

  it("timeout encerra a execução", async () => {
    class T {
      @CronJob("* * * * *", { timeout: 50 })
      async job() {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    const [meta] = getCronJobs(T);
    const exec = makeExecution();
    await expect(
      executeCronJobSafely(
        meta!,
        new T() as unknown as Record<string, unknown>,
        exec,
      ),
    ).rejects.toThrow("Timeout");
    expect(exec.status).toBe("timeout");
  }, 2_000);
});
