import "reflect-metadata";
import { INJECTABLE_METADATA_KEY, INJECT_METADATA_KEY } from "./metadata-keys";

export type Scope = "singleton" | "transient";

export interface InjectableOptions {
  scope?: Scope;
}

type Constructor<T = any> = new (...args: any[]) => T;

class DIContainer {
  private registry = new Map<Constructor, InjectableOptions>();
  private singletons = new Map<Constructor, any>();
  private resolving = new Set<Constructor>();

  register<T>(target: Constructor<T>, options?: InjectableOptions): void {
    this.registry.set(target, { scope: "singleton", ...options });
  }

  get<T>(target: Constructor<T>): T {
    if (this.resolving.has(target)) {
      const chain = [...this.resolving].map((c) => c.name).join(" → ");
      throw new Error(`Dependência circular detectada: ${chain} → ${target.name}`);
    }

    const options = this.registry.get(target);
    const scope = options?.scope ?? "singleton";

    if (scope === "singleton" && this.singletons.has(target)) {
      return this.singletons.get(target) as T;
    }

    this.resolving.add(target);
    try {
      const injectedTokens: (Constructor | undefined)[] =
        Reflect.getOwnMetadata(INJECT_METADATA_KEY, target) ?? [];
      const paramTypes: Constructor[] = Reflect.getMetadata("design:paramtypes", target) ?? [];
      const deps = paramTypes.map((dep, index) => {
        const token = injectedTokens[index] ?? dep;
        if (token === Number || token === String || token === Object || token === Boolean) {
          throw new Error(
            `Tipos primitivos/Interfaces não suportados no DI: impedindo falha silenciosa em ${target.name}. Use @Inject(Token) ou corrija os tipos.`,
          );
        }
        return this.get(token);
      });

      const instance = new target(...deps) as T;

      if (scope === "singleton") {
        this.singletons.set(target, instance);
      }

      return instance;
    } finally {
      this.resolving.delete(target);
    }
  }

  has(target: Constructor): boolean {
    return this.registry.has(target);
  }

  clear(): void {
    this.singletons.clear();
    this.registry.clear();
    this.resolving.clear();
  }
}

export const Container = new DIContainer();

export function Injectable(options?: InjectableOptions): ClassDecorator {
  return (target: Function) => {
    const opts: InjectableOptions = { scope: "singleton", ...options };
    Reflect.defineMetadata(INJECTABLE_METADATA_KEY, opts, target);
    Container.register(target as Constructor, opts);
  };
}

export function Inject(token: Constructor): ParameterDecorator {
  return (target: Object, _propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const existingTokens: (Constructor | undefined)[] =
      Reflect.getOwnMetadata(INJECT_METADATA_KEY, target) ?? [];
    existingTokens[parameterIndex] = token;
    Reflect.defineMetadata(INJECT_METADATA_KEY, existingTokens, target);
  };
}
