import {
  CronJob,
  CRON_PATTERNS,
  getCronJobs,
  executeCronJobSafely,
} from "../../../../packages/reflected/src/index.js";
import { Injectable } from "../../../../packages/reflected/src/container.js";
import type {
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "../../../../packages/reflected/src/lifecycle.js";

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
      await executeCronJobSafely(this, job.name);
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
