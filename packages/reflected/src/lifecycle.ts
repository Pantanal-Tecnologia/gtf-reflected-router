export interface OnApplicationBootstrap {
  onApplicationBootstrap(): Promise<void> | void;
}

export interface OnApplicationShutdown {
  onApplicationShutdown(signal?: string): Promise<void> | void;
}
