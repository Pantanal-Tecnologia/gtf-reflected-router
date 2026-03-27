type Constructor<T = any> = new (...args: any[]) => T;

class ControllerRegistry {
  private controllers = new Set<Constructor>();

  register(target: Constructor): void {
    this.controllers.add(target);
  }

  getAll(): Constructor[] {
    return [...this.controllers];
  }

  clear(): void {
    this.controllers.clear();
  }
}

export const registry = new ControllerRegistry();
