# gtf-reflected-router

> Decorators TypeScript para definir e gerenciar rotas Fastify de forma
> declarativa e type-safe.

[![npm version](https://img.shields.io/npm/v/gtf-reflected-router.svg)](https://www.npmjs.com/package/gtf-reflected-router)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-black.svg)](https://fastify.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Instalação

```bash
npm install gtf-reflected-router reflect-metadata
# ou
pnpm add gtf-reflected-router reflect-metadata
# ou
yarn add gtf-reflected-router reflect-metadata
```

> **Atenção:** adicione `import "reflect-metadata"` no ponto de entrada da sua
> aplicação, antes de qualquer outro import.

---

## Configuração TypeScript

No seu `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

---

## Início Rápido

```typescript
import "reflect-metadata";
import {
  Controller,
  Get,
  Post,
  Request,
  Response,
  getRoutes,
  getControllerPrefix,
} from "gtf-reflected-router";
import type { FastifyRequest, FastifyReply } from "fastify";
import fastify from "fastify";

@Controller("/users")
class UserController {
  @Get("/")
  async getAll() {
    return [{ id: 1, name: "Alice" }];
  }

  @Get("/:id")
  async getById(@Request() req: FastifyRequest<{ Params: { id: string } }>) {
    return { id: req.params.id };
  }

  @Post("/")
  async create(
    @Request() req: FastifyRequest<{ Body: { name: string } }>,
    @Response() reply: FastifyReply,
  ) {
    reply.code(201).send({ id: 2, ...req.body });
  }
}

// Registrar rotas no Fastify
const app = fastify();
const instance = new UserController();
const prefix = getControllerPrefix(UserController); // "/users"

for (const route of getRoutes(UserController)) {
  app.route({
    method: route.method,
    url: prefix + route.path, // ex: GET /users/:id
    handler: instance[route.handler].bind(instance),
    ...route.options,
  });
}

await app.listen({ port: 3000 });
```

---

## Sub-paths

O pacote exporta sub-paths para tree-shaking:

| Import                            | Conteúdo                         |
| --------------------------------- | -------------------------------- |
| `gtf-reflected-router`            | Tudo (decorators + cron)         |
| `gtf-reflected-router/decorators` | Somente decorators de rota       |
| `gtf-reflected-router/cron`       | Somente `@CronJob` e utilitários |

---

## API — Decorators de Rota

### `@Controller(prefix?)`

Decorator de **classe** que define o prefixo base de todas as rotas do
controller.

```typescript
@Controller("/products")
class ProductController {
  @Get("/") getAll() {} // → GET /products/
  @Get("/:id") getById() {} // → GET /products/:id
  @Post("/") create() {} // → POST /products/
  @Delete("/:id") remove() {} // → DELETE /products/:id
}
```

### `@Route(method, path, options?)`

Decorator base genérico. Todos os shorthands abaixo são açúcar sintático sobre
ele.

### Shorthands HTTP

| Decorator                  | Método  |
| -------------------------- | ------- |
| `@Get(path, options?)`     | GET     |
| `@Post(path, options?)`    | POST    |
| `@Put(path, options?)`     | PUT     |
| `@Delete(path, options?)`  | DELETE  |
| `@Patch(path, options?)`   | PATCH   |
| `@Head(path, options?)`    | HEAD    |
| `@Options(path, options?)` | OPTIONS |

O parâmetro `options` aceita qualquer opção do Fastify (exceto `method`, `url` e
`handler`), como `schema`, `preHandler`, `config`, etc.

```typescript
@Get("/products", {
  schema: {
    tags: ["products"],
    response: {
      200: {
        type: "array",
        items: { type: "object", properties: { id: { type: "number" } } },
      },
    },
  },
})
async listProducts() { ... }
```

### `@Request()` e `@Response()`

Injetam `FastifyRequest` e `FastifyReply` como parâmetros do handler.

```typescript
@Post("/orders")
async createOrder(
  @Request()  req:   FastifyRequest<{ Body: OrderBody }>,
  @Response() reply: FastifyReply,
) {
  const order = await this.service.create(req.body);
  reply.code(201).send(order);
}
```

---

## API — Cron Jobs

Importe de `gtf-reflected-router/cron`:

### `@CronJob(expression, options?)`

```typescript
import { CronJob, CRON_PATTERNS } from "gtf-reflected-router/cron";

class TaskScheduler {
  @CronJob(CRON_PATTERNS.DAILY_MIDNIGHT, {
    timezone: "America/Sao_Paulo",
    description: "Limpeza diária de dados temporários",
    timeout: 30_000,
    retryAttempts: 3,
    retryDelay: 5_000,
    onError: (name, err) => console.error(`[${name}]`, err),
  })
  async dailyCleanup(): Promise<void> {
    // ...
  }
}
```

### `CRON_PATTERNS`

Constantes de expressões cron pré-definidas:

| Constante           | Expressão     | Descrição       |
| ------------------- | ------------- | --------------- |
| `EVERY_MINUTE`      | `* * * * *`   | Todo minuto     |
| `EVERY_5_MINUTES`   | `*/5 * * * *` | A cada 5 min    |
| `EVERY_HOUR`        | `0 * * * *`   | A cada hora     |
| `DAILY_MIDNIGHT`    | `0 0 * * *`   | Meia-noite      |
| `DAILY_NOON`        | `0 12 * * *`  | Ao meio-dia     |
| `WEEKLY_MONDAY`     | `0 0 * * 1`   | Segunda-feira   |
| `MONTHLY_FIRST_DAY` | `0 0 1 * *`   | Primeiro do mês |

Ver arquivo `src/cron.ts` para a lista completa.

### Opções do `@CronJob`

| Opção            | Tipo      | Default | Descrição                          |
| ---------------- | --------- | ------- | ---------------------------------- |
| `timezone`       | `string`  | —       | Ex: `"America/Sao_Paulo"`          |
| `enabled`        | `boolean` | `true`  | Ativa/desativa o job               |
| `runOnInit`      | `boolean` | `false` | Executa imediatamente ao registrar |
| `maxConcurrency` | `number`  | `1`     | Máximo de execuções simultâneas    |
| `timeout`        | `number`  | —       | Timeout em ms                      |
| `retryAttempts`  | `number`  | `0`     | Tentativas de retry                |
| `retryDelay`     | `number`  | `1000`  | Delay entre retries (ms)           |
| `priority`       | `number`  | `5`     | 1 (alta) a 10 (baixa)              |
| `onStart`        | `fn`      | —       | Callback ao iniciar                |
| `onComplete`     | `fn`      | —       | Callback ao concluir               |
| `onError`        | `fn`      | —       | Callback ao falhar                 |

### Funções Utilitárias — Cron

```typescript
import {
  getCronJobs, // Todos os jobs de uma classe
  getCronJob, // Job específico pelo nome
  hasCronJobs, // Verifica se a classe tem jobs
  getActiveCronJobs, // Somente jobs com enabled !== false
  executeCronJobSafely, // Executa com retry/timeout/callbacks
  validateCronExpression, // Valida expressão (throws se inválida)
} from "gtf-reflected-router/cron";
```

---

## API — Funções Utilitárias (Rotas)

```typescript
import {
  getRoutes, // RouteMetadata[] registradas em um controller
  getControllerPrefix, // Prefixo definido pelo @Controller
  getRequestParams, // Índices dos parâmetros @Request
  getResponseParams, // Índices dos parâmetros @Response
} from "gtf-reflected-router/decorators";
```

---

## Integração com Fastify Plugin

Para registrar múltiplos controllers automaticamente:

```typescript
import fastifyPlugin from "fastify-plugin";
import {
  getRoutes,
  getControllerPrefix,
} from "gtf-reflected-router/decorators";

export const controllerPlugin = fastifyPlugin(async (fastify, options) => {
  for (const Controller of options.controllers) {
    const instance = new Controller();
    const prefix = options.prefix + getControllerPrefix(Controller);

    for (const route of getRoutes(Controller)) {
      fastify.route({
        method: route.method,
        url: prefix + route.path,
        handler: instance[route.handler].bind(instance),
        ...route.options,
      });
    }
  }
});

// Uso:
app.register(controllerPlugin, {
  controllers: [UserController, ProductController],
  prefix: "/api/v1",
});
// → GET /api/v1/users/
// → GET /api/v1/users/:id
// → GET /api/v1/products/
```

---

## Requisitos

| Dependência      | Versão mínima |
| ---------------- | ------------- |
| Node.js          | 18+           |
| TypeScript       | 5.x           |
| reflect-metadata | 0.2+          |
| Fastify          | 5.x           |

---

## Testes

```bash
# Rodar todos os testes
pnpm test

# Watch mode
pnpm test:watch

# Com cobertura
pnpm test:coverage
```

A suite cobre: decorators de rota, `@Controller`, parâmetros
`@Request`/`@Response`, validação de expressão cron, `@CronJob`, executor com
retry/timeout e funções utilitárias.

---

## Contribuindo

```bash
# Clonar e instalar
git clone https://github.com/Pantanal-Tecnologia/gtf-reflected-router
cd gtf-reflected-router
pnpm install

# Build da lib
cd packages/reflected
pnpm build

# Rodar testes
pnpm test

# Lint
pnpm lint

# Formatar
pnpm -w format
```
