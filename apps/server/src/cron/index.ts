import { CronJob, CRON_PATTERNS, getCronJobs, executeCronJobSafely } from "gtf-reflected-router";
import { Injectable } from "gtf-reflected-router";
import type { OnApplicationBootstrap, OnApplicationShutdown } from "gtf-reflected-router";

@Injectable()
export class Cron implements OnApplicationBootstrap, OnApplicationShutdown {
  private jobs: ReturnType<typeof setInterval>[] = [];

  @CronJob(CRON_PATTERNS.DAILY_MIDNIGHT, {
    description: "Daily midnight cron job",
    timezone: "America/Sao_Paulo",
    maxConcurrency: 1,
    timeout: 10000,
    priority: 1,
  })
  async dailyBackup(): Promise<void> {
    console.log("💾 Iniciando backup diário...");
  }

  async onApplicationBootstrap(): Promise<void> {
    const cronJobs = getCronJobs(Cron);
    console.log(`[Cron] Iniciando ${cronJobs.length} job(s)...`);

    for (const job of cronJobs) {
      await executeCronJobSafely(
        {
          expression: job.expression,
          name: job.name,
          handler: job.handler,
          options: job.options,
        },
        {
          fixedDelay: 1000,
        },
        {
          jobName: job.name,
          startTime: new Date(),
          status: "running",
          attempt: 1,
        },
      );
    }
  }

  onApplicationShutdown(signal?: string): void {
    console.log(`[Cron] Parando jobs (sinal: ${signal ?? "desconhecido"})...`);
    for (const interval of this.jobs) {
      clearInterval(interval);
    }
    this.jobs = [];
  }
}
