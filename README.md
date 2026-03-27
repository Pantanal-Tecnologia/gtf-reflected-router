# gtf-reflected-router

> Decorators TypeScript para definir e gerenciar rotas Fastify de forma
> declarativa, modular e type-safe, com suporte nativo a Injeção de Dependências e Validação.

[![npm version](https://img.shields.io/npm/v/gtf-reflected-router.svg)](https://www.npmjs.com/package/gtf-reflected-router)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-black.svg)](https://fastify.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🚀 Novidades na Versão 1.0.x

- **Injeção de Dependências (DI)**: Suporte nativo com `@Injectable()`.
- **Guards e Interceptors**: Proteção de rotas e interceptação de chamadas.
- **Validação com Zod**: Validação automática de parâmetros e corpo de requisição.
- **Auto-Discovery**: Descoberta automática de controllers no sistema de arquivos.
- **Hooks de Ciclo de Vida**: `OnApplicationBootstrap` e `OnApplicationShutdown`.

---

## Instalação

```bash
pnpm add gtf-reflected-router reflect-metadata zod
```

> **Atenção:** adicione `import "reflect-metadata"` no ponto de entrada da sua aplicação.

---

## Início Rápido (Moderno)

```typescript
import "reflect-metadata";
import { 
  Controller, Get, Post, Body, Param, 
  Injectable, UseGuards, UseInterceptors,
  discoverControllers 
} from "gtf-reflected-router";
import { z } from "zod";

// 1. Defina um Schema de Validação
const CreateUserSchema = z.object({
  username: z.string().min(3),
  role: z.enum(["admin", "user"])
});

// 2. Crie um Serviço Injetável
@Injectable()
class UserService {
  async create(data: any) { return { id: 1, ...data }; }
}

// 3. Crie um Controller
@Controller("/users")
@Injectable()
class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("/:id")
  async getById(@Param("id") id: string) {
    return { id };
  }

  @Post("/")
  async create(@Body(CreateUserSchema) body: z.infer<typeof CreateUserSchema>) {
    return this.userService.create(body);
  }
}

// 4. Inicialize o Fastify
const app = fastify();
// ... registre o plugin customizado (veja seção Plugin)
```

---

## 🏗️ Arquitetura e DI

O framework utiliza um `Container` interno para gerenciar a vida útil dos seus componentes.

```typescript
import { Injectable, Container } from "gtf-reflected-router";

@Injectable({ scope: "singleton" }) // Default
class DatabaseService { ... }

// Recuperando instâncias manualmente se necessário
const db = Container.get(DatabaseService);
```

---

## 🛡️ Guards e Interceptors

### Guards (`CanActivate`)
Ideais para autenticação e permissões.

```typescript
@Injectable()
class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    return !!request.headers.authorization;
  }
}

@Controller("/admin")
@UseGuards(AuthGuard) // Protege todas as rotas da classe
class AdminController { ... }
```

### Interceptors (`Interceptor`)
Para logging, transformação de resposta ou métricas.

```typescript
@Injectable()
class LoggingInterceptor implements Interceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    console.log("Antes...");
    const result = await next.handle();
    console.log("Depois...");
    return result;
  }
}
```

---

## 🔍 Auto-Discovery

Não registre manualmente cada controller. Deixe o framework encontrá-los.

```typescript
import { discoverControllers } from "gtf-reflected-router";
import path from "node:path";

// Procura por todos os *.controller.ts recursivamente
await discoverControllers({ 
  cwd: path.join(__dirname, "modules") 
});
```

---

## ⏱️ Cron Jobs

Integre tarefas agendadas diretamente nas suas classes.

```typescript
import { CronJob, CRON_PATTERNS } from "gtf-reflected-router";

@Injectable()
class BackupTask {
  @CronJob(CRON_PATTERNS.DAILY_MIDNIGHT)
  async runBackup() {
    // Executado todo dia à meia-noite
  }
}
```

---

## API — Decorators de Parâmetros

| Decorator   | Descrição                                      | Suporte Zod |
| ----------- | ---------------------------------------------- | ----------- |
| `@Body()`   | Injeta o corpo da requisição (`request.body`)  | ✅ Sim      |
| `@Param()`  | Injeta parâmetros da URL (`request.params`)    | ✅ Sim      |
| `@Query()`  | Injeta query strings (`request.query`)         | ✅ Sim      |
| `@Headers()`| Injeta headers HTTP (`request.headers`)        | ✅ Sim      |
| `@Req()`    | Injeta a instância original do `FastifyRequest`| ❌ Não      |
| `@Res()`    | Injeta a instância original do `FastifyReply`  | ❌ Não      |

---

## Requisitos

| Dependência      | Versão mínima |
| ---------------- | ------------- |
| Node.js          | 18+           |
| TypeScript       | 5.x           |
| reflect-metadata | 0.2+          |
| Fastify          | 5.x           |
| Zod (opcional)   | 3.x           |

---

## Contribuindo

Para rodar o ambiente de desenvolvimento:

```bash
git clone https://github.com/Pantanal-Tecnologia/gtf-reflected-router
pnpm install
pnpm dev # Inicia a aplicação de exemplo (apps/server)
```

---

## Licença

MIT © [Pantanal Tecnologia](https://github.com/Pantanal-Tecnologia)
