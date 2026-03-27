import { glob } from "fast-glob";
import { registry } from "./registry";

export interface DiscoverOptions {
  /** Glob patterns para encontrar controllers. Default: ['**\/*.controller.ts', '**\/*.controller.js'] */
  patterns?: string[];
  /** Diretório raiz para busca */
  cwd: string;
  /** Patterns para ignorar */
  ignore?: string[];
}

export async function discoverControllers(options: DiscoverOptions): Promise<void> {
  const {
    patterns = ["**/*.controller.ts", "**/*.controller.js"],
    cwd,
    ignore = ["**/node_modules/**", "**/__tests__/**", "**/dist/**"],
  } = options;

  const files = await glob(patterns, { cwd, ignore, absolute: true });

  for (const file of files) {
    await import(file);
  }
}

export function getRegisteredControllers() {
  return registry.getAll();
}
