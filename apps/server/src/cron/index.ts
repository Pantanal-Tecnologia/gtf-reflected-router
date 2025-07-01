import {CronJob, CRON_PATTERNS} from "../../../../packages/reflected";

export class Cron {
  
  @CronJob(CRON_PATTERNS.DAILY_MIDNIGHT, {
    description: "Daily midnight cron job",
    timezone: "America/Sao_Paulo",
    maxConcurrency: 1,
    timeout: 10000,
    priority: 1
  })
  async dailyBackup(): Promise<void> {
    console.log("💾 Iniciando backup diário...");
  }
  
}