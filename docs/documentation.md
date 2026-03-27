# gtf-reflected-router — Documentação Completa

> **Pacote npm:** `gtf-reflected-router` v1.0.12
> **Git Commit:** `6aeda1b093983addeae151f84d7545c685e06a40`
> **Branch:** `main`
> **Data:** 2026-03-27

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Instalação & Configuração](#2-instalação--configuração)
3. [Estrutura do Monorepo](#3-estrutura-do-monorepo)
4. [API de Decorators](#4-api-de-decorators)
   - [@Controller](#controller)
   - [HTTP Methods: @Get, @Post, @Put, @Delete, @Patch, @Head, @Options](#http-methods)
   - [@Route (genérico)](#route-genérico)
   - [@HttpCode](#httpcode)
   - [@Injectable](#injectable)
   - [@UseGuards](#useguards)
   - [@UseInterceptors](#useinterceptors)
   - [@CronJob](#cronjob)
5. [Decorators de Parâmetros](#5-decorators-de-parâmetros)
   - [@Body](#body)
   - [@Query](#query)
   - [@Param](#param)
   - [@Headers](#headers)
   - [@Req / @Res](#req--res)
   - [createParamDecorator](#createparamdecorator)
6. [Container de Injeção de Dependência](#6-container-de-injeção-de-dependência)
7. [Guards](#7-guards)
8. [Interceptors](#8-interceptors)
9. [Lifecycle Hooks](#9-lifecycle-hooks)
10. [Auto-Discovery de Controllers](#10-auto-discovery-de-controllers)
11. [Registry](#11-registry)
12. [Cron Jobs](#12-cron-jobs)
13. [Controller Plugin (Fastify)](#13-controller-plugin-fastify)
14. [Tipos e Interfaces](#14-tipos-e-interfaces)
15. [Chaves de Metadados](#15-chaves-de-metadados)
16. [Exemplo Completo (app/server)](#16-exemplo-completo-appserver)
17. [Fluxo de Execução de uma Requisição](#17-fluxo-de-execução-de-uma-requisição)
18. [Padrões e Dicas](#18-padrões-e-dicas)

---

## 1. Visão Geral

`gtf-reflected-router` é uma biblioteca TypeScript que adiciona uma camada declarativa baseada em decorators ao **Fastify 5**. Inspirada na arquitetura do NestJS, ela permite definir rotas, validações, guards, interceptors e cron jobs usando decorators sem abrir mão da performance nativa do Fastify.

**Funcionalidades principais:**
- Decorators de rotas HTTP (`@Get`, `@Post`, `@Put`, `@Delete`, `@Patch`, `@Head`, `@Options`)
- Injeção de dependência (DI) via `@Injectable` e `Container`
- Guards de autorização via `@UseGuards`
- Interceptors (before/after handler) via `@UseInterceptors`
- Decorators de parâmetros com validação Zod integrada
- Decorators customizados de parâmetros via `createParamDecorator`
- Auto-discovery de controllers via glob
- Cron jobs declarativos via `@CronJob`
- Lifecycle hooks: `OnApplicationBootstrap` e `OnApplicationShutdown`

---

## 2. Instalação & Configuração

```bash
pnpm add gtf-reflected-router reflect-metadata fastify
# Zod é opcional (peer dependency)
pnpm add zod
```

**`tsconfig.json` obrigatório:**
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "target": "ES2022"
  }
}
```

**Importar `reflect-metadata` no entry point (obrigatório, antes de qualquer import):**
```typescript
import "reflect-metadata";
```

---

## 3. Estrutura do Monorepo

```
gtf-reflected-router/
├── packages/
│   ├── reflected/               # Biblioteca principal (gtf-reflected-router)
│   │   └── src/
│   │       ├── index.ts         # Entrypoint público — re-exporta tudo
│   │       ├── decorators.ts    # @Controller, @Route, @Get/@Post/..., @HttpCode
│   │       ├── container.ts     # DIContainer, @Injectable
│   │       ├── discovery.ts     # discoverControllers(), getRegisteredControllers()
│   │       ├── guards.ts        # @UseGuards, getGuards(), CanActivate
│   │       ├── interceptors.ts  # @UseInterceptors, getInterceptors(), Interceptor
│   │       ├── lifecycle.ts     # OnApplicationBootstrap, OnApplicationShutdown
│   │       ├── params.ts        # @Body, @Query, @Param, @Headers, @Req, @Res, createParamDecorator
│   │       ├── registry.ts      # ControllerRegistry singleton
│   │       ├── cron.ts          # @CronJob, CRON_PATTERNS, executeCronJobSafely
│   │       ├── types.ts         # Tipos, enums, interfaces
│   │       └── metadata-keys.ts # Symbol.for() keys de metadados
│   ├── eslint-config/           # Configuração ESLint compartilhada
│   └── typescript-config/       # Configuração TypeScript compartilhada
└── apps/
    └── server/                  # App de demonstração / referência
        └── src/
            ├── index.ts                       # Bootstrap do servidor
            ├── common/users.data.ts           # Dados mock
            ├── core/
            │   ├── plugins/controller-plugin.ts  # Plugin Fastify que aplica tudo
            │   ├── guards/auth.guard.ts           # Exemplo de guard
            │   └── interceptors/logging.interceptor.ts  # Exemplo de interceptor
            ├── modules/
            │   ├── users/users.controller.ts
            │   ├── users/users.service.ts
            │   ├── auth/auth.controller.ts
            │   ├── auth/auth.service.ts
            │   └── address/address.controller.ts
            └── cron/index.ts                  # Exemplo de cron job
```

---

## 4. API de Decorators

### `@Controller`

**Arquivo:** `packages/reflected/src/decorators.ts:26`

Class decorator que define o prefixo de rotas e registra a classe no `Container` (singleton) e no `registry`.

```typescript
function Controller(prefix?: string): ClassDecorator
```

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `prefix` | `string` | `""` | Prefixo de URL. **Deve** começar com `/` se fornecido. |

**Comportamento:**
- Armazena o prefixo via `Reflect.defineMetadata(CONTROLLER_PREFIX_METADATA_KEY, prefix, target)`
- Registra a classe no `Container` com scope `singleton`
- Adiciona a classe ao `registry` global

**Exemplo:**
```typescript
@Controller("/users")
class UserController {
  // rotas serão montadas em /users/*
}
```

**Validação:** Lança `Error` se o prefixo não começar com `/`.

---

### HTTP Methods

**Arquivo:** `packages/reflected/src/decorators.ts:82–112`

Todos são aliases do decorator genérico `@Route`:

```typescript
Get(path: string, options?: Omit<RouteOptions, "method" | "url" | "handler">): MethodDecorator
Post(path: string, options?: ...): MethodDecorator
Put(path: string, options?: ...): MethodDecorator
Delete(path: string, options?: ...): MethodDecorator
Patch(path: string, options?: ...): MethodDecorator
Head(path: string, options?: ...): MethodDecorator
Options(path: string, options?: ...): MethodDecorator
```

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `path` | `string` | Caminho relativo ao prefixo do controller. **Deve** começar com `/`. |
| `options` | `Omit<RouteOptions, "method" \| "url" \| "handler">` | Opções Fastify: `schema`, `preHandler`, `onSend`, etc. |

**Exemplo:**
```typescript
@Get("/", {
  schema: {
    tags: ["users"],
    summary: "Lista todos os usuários",
    response: { 200: { type: "array" } }
  }
})
async getUsers() {
  return this.usersService.findAll();
}

@Post("/:id/action", {
  schema: { body: { type: "object" } }
})
async doAction(@Param("id") id: string, @Body() body: unknown) { ... }
```

---

### `@Route` (genérico)

**Arquivo:** `packages/reflected/src/decorators.ts:41`

Decorator de método base. Os helpers `@Get`, `@Post`, etc. são wrappers deste.

```typescript
function Route(
  method: string,
  path: string,
  options?: Omit<RouteOptions, "method" | "url" | "handler">
): MethodDecorator
```

**Armazena** na lista `ROUTES_METADATA_KEY` do constructor:
```typescript
interface RouteMetadata {
  method: HttpMethod;  // "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS"
  path: string;
  handler: string;     // nome do método da classe
  options?: Omit<RouteOptions, "method" | "url" | "handler">;
}
```

**Validações:**
- Método deve ser um `HttpMethod` válido
- Path deve começar com `/`
- Não permite rotas duplicadas (mesmo método + path no mesmo controller)

---

### `@HttpCode`

**Arquivo:** `packages/reflected/src/decorators.ts:176`

Method decorator que define o status HTTP de resposta.

```typescript
function HttpCode(statusCode: number): MethodDecorator
```

**Exemplo:**
```typescript
@Post("/")
@HttpCode(201)
async createUser(@Body() data: CreateDto) {
  return this.service.create(data);
}
```

O `controllerPlugin` aplica `reply.status(httpCode)` antes de retornar.

---

### `@Injectable`

**Arquivo:** `packages/reflected/src/container.ts:71`

Class decorator que registra a classe no `Container` DI.

```typescript
function Injectable(options?: InjectableOptions): ClassDecorator

interface InjectableOptions {
  scope?: "singleton" | "transient";  // padrão: "singleton"
}
```

**Exemplo:**
```typescript
@Injectable()
export class UsersService {
  async findAll() { ... }
}

@Injectable({ scope: "transient" })
export class RequestLogger { ... }
```

> **Nota:** `@Controller` já registra automaticamente no Container. `@Injectable` é para services e outras classes que precisam ser injetadas mas não são controllers.

---

### `@UseGuards`

**Arquivo:** `packages/reflected/src/guards.ts:11`

Class ou method decorator que aplica guards de autorização.

```typescript
function UseGuards(...guards: (Constructor<CanActivate> | CanActivate)[]): ClassDecorator & MethodDecorator
```

- **No nível de classe:** aplica a todas as rotas do controller
- **No nível de método:** aplica apenas àquela rota
- Guards de classe + método são **concatenados** (classe primeiro)

**Exemplo:**
```typescript
// Guard em método específico
@Delete("/:id")
@UseGuards(AuthGuard)
async deleteUser(@Param("id") id: string) { ... }

// Guard em toda a classe
@UseGuards(AuthGuard)
@Controller("/admin")
class AdminController { ... }
```

---

### `@UseInterceptors`

**Arquivo:** `packages/reflected/src/interceptors.ts:15`

Class ou method decorator que aplica interceptors (execução antes e depois do handler).

```typescript
function UseInterceptors(...interceptors: (Constructor<Interceptor> | Interceptor)[]): ClassDecorator & MethodDecorator
```

- **No nível de classe:** aplica a todas as rotas
- **No nível de método:** aplica apenas àquela rota
- Interceptors de classe + método são **concatenados** e executados em cadeia via `reduceRight`

**Exemplo:**
```typescript
@Injectable()
@Controller("/users")
@UseInterceptors(LoggingInterceptor)
export class UserController { ... }
```

---

### `@CronJob`

**Arquivo:** `packages/reflected/src/cron.ts:132`

Method decorator que registra um job cron na classe.

```typescript
function CronJob(expression: string, options?: CronJobOptions): MethodDecorator
```

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `expression` | `string` | Expressão cron (5 ou 6 partes). Validada em tempo de decoração. |
| `options` | `CronJobOptions` | Opções de configuração do job. |

**`CronJobOptions`:**
```typescript
interface CronJobOptions {
  timezone?: string;           // Ex: "America/Sao_Paulo"
  runOnInit?: boolean;         // Executar imediatamente no bootstrap (padrão: false)
  description?: string;        // Descrição do job
  enabled?: boolean;           // Habilitar/desabilitar (padrão: true)
  maxConcurrency?: number;     // Máximo de execuções simultâneas (padrão: 1, min: 1)
  timeout?: number;            // Timeout em ms (inteiro > 0)
  onStart?: (jobName: string) => void;
  onComplete?: (jobName: string, result?: unknown) => void;
  onError?: (jobName: string, error: Error) => void;
  priority?: number;           // 1–10 (padrão: 5)
  retryAttempts?: number;      // Tentativas após falha (>= 0, padrão: 0)
  retryDelay?: number;         // Delay entre tentativas em ms (padrão: 1000)
}
```

**Exemplo:**
```typescript
@Injectable()
export class Cron implements OnApplicationBootstrap {
  @CronJob(CRON_PATTERNS.DAILY_MIDNIGHT, {
    description: "Backup diário",
    timezone: "America/Sao_Paulo",
    timeout: 10000,
    priority: 1,
  })
  async dailyBackup(): Promise<void> {
    console.log("Iniciando backup...");
  }
}
```

---

## 5. Decorators de Parâmetros

Todos extraem dados da requisição Fastify e os injetam como argumentos do método handler.

**Arquivo:** `packages/reflected/src/params.ts`

### `@Body`

```typescript
Body(keyOrSchema?: string | ZodLike): ParameterDecorator
```

- Sem argumento: injeta `request.body` inteiro
- Com string: injeta `request.body[key]`
- Com schema Zod: injeta `request.body` após validação Zod (400 em falha)

```typescript
async create(@Body() data: unknown) { ... }
async create(@Body("username") name: string) { ... }
async create(@Body(CreateUserSchema) data: z.infer<typeof CreateUserSchema>) { ... }
```

---

### `@Query`

```typescript
Query(keyOrSchema?: string | ZodLike): ParameterDecorator
```

- Sem argumento: injeta `request.query` inteiro
- Com string: injeta `request.query[key]`
- Com schema Zod: valida e injeta

```typescript
async list(@Query("page") page: string) { ... }
async list(@Query() filters: Record<string, string>) { ... }
```

---

### `@Param`

```typescript
Param(keyOrSchema?: string | ZodLike): ParameterDecorator
```

- Sem argumento: injeta `request.params` inteiro
- Com string: injeta `request.params[key]`

```typescript
async getById(@Param("id") id: string) { ... }
async get(@Param() allParams: Record<string, string>) { ... }
```

---

### `@Headers`

```typescript
Headers(keyOrSchema?: string | ZodLike): ParameterDecorator
```

- Sem argumento: injeta `request.headers` inteiro
- Com string: injeta `request.headers[key]`

```typescript
async secure(@Headers("authorization") auth: string) { ... }
```

---

### `@Req` / `@Res`

```typescript
Req(keyOrSchema?: string | ZodLike): ParameterDecorator
Res(keyOrSchema?: string | ZodLike): ParameterDecorator
```

Injetam o objeto `FastifyRequest` ou `FastifyReply` completo.

```typescript
async handler(@Req() req: FastifyRequest, @Res() res: FastifyReply) { ... }
```

> **Nota:** `@Request()` e `@Response()` do módulo `decorators` são **deprecated**. Use `@Req()` e `@Res()` de `params`.

---

### `createParamDecorator`

**Arquivo:** `packages/reflected/src/params.ts:47`

Cria decorators de parâmetro customizados.

```typescript
function createParamDecorator<TData = any, TResult = any>(
  factory: CustomParamFactory<TData, TResult>
): (data?: TData) => ParameterDecorator

type CustomParamFactory<TData, TResult> = (
  data: TData,
  ctx: ExecutionContext
) => TResult | Promise<TResult>
```

**Exemplo — extrair usuário do token:**
```typescript
const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user; // populado por um guard anterior
});

@Get("/profile")
async getProfile(@CurrentUser() user: User) {
  return user;
}
```

---

## 6. Container de Injeção de Dependência

**Arquivo:** `packages/reflected/src/container.ts`

O `Container` é uma instância global de `DIContainer` — um container DI com resolução automática de dependências via `reflect-metadata` (`design:paramtypes`).

### Métodos Públicos

```typescript
Container.register<T>(target: Constructor<T>, options?: InjectableOptions): void
```
Registra uma classe no container. Chamado automaticamente por `@Injectable` e `@Controller`.

```typescript
Container.get<T>(target: Constructor<T>): T
```
Resolve e retorna uma instância. Para `singleton`, retorna a mesma instância em todas as chamadas. Para `transient`, cria nova instância sempre.

- Resolve dependências do construtor recursivamente via `design:paramtypes`
- Detecta dependências circulares e lança `Error` descritivo
- Rejeita tipos primitivos (`Number`, `String`, `Boolean`, `Object`) como dependências

```typescript
Container.has(target: Constructor): boolean
```
Verifica se uma classe está registrada.

```typescript
Container.clear(): void
```
Limpa singletons, registry e estado de resolução. Útil em testes.

### Escopos

| Scope | Comportamento |
|-------|--------------|
| `"singleton"` | Uma instância por container (padrão) |
| `"transient"` | Nova instância a cada `Container.get()` |

### Exemplo de Injeção Automática

```typescript
@Injectable()
class DatabaseService {
  query(sql: string) { ... }
}

@Injectable()
class UserRepository {
  constructor(private db: DatabaseService) {}  // ← injetado automaticamente
}

@Injectable()
@Controller("/users")
class UserController {
  constructor(private repo: UserRepository) {}  // ← injetado automaticamente
}
```

---

## 7. Guards

**Arquivo:** `packages/reflected/src/guards.ts`

Guards controlam acesso às rotas. Implementam a interface `CanActivate`.

### Interface `CanActivate`

```typescript
interface CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean>
}
```

- Retorna `true` → continua o pipeline
- Retorna `false` → resposta `403 Forbidden`

### Função `getGuards`

```typescript
function getGuards(
  target: object,
  propertyKey?: string | symbol
): (Constructor<CanActivate> | CanActivate)[]
```

Retorna guards de classe **concatenados** com guards de método.

### Exemplo de Guard

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return false;
    const token = authHeader.split(" ")[1];
    return Container.get(AuthService).validateToken(token);
  }
}
```

---

## 8. Interceptors

**Arquivo:** `packages/reflected/src/interceptors.ts`

Interceptors envolvem a execução do handler, permitindo lógica antes e depois.

### Interfaces

```typescript
interface CallHandler {
  handle(): Promise<unknown>
}

interface Interceptor {
  intercept(context: ExecutionContext, next: CallHandler): Promise<unknown>
}
```

### Função `getInterceptors`

```typescript
function getInterceptors(
  target: object,
  propertyKey?: string | symbol
): (Constructor<Interceptor> | Interceptor)[]
```

### Exemplo de Interceptor

```typescript
@Injectable()
export class LoggingInterceptor implements Interceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<unknown> {
    const request = context.switchToHttp().getRequest();
    const now = Date.now();
    console.log(`Before: ${request.method} ${request.url}`);

    const result = await next.handle();  // executa o handler

    console.log(`After: ${Date.now() - now}ms`);
    return result;
  }
}
```

A cadeia de interceptors é construída com `reduceRight`, então o primeiro interceptor declarado é o mais externo.

---

## 9. Lifecycle Hooks

**Arquivo:** `packages/reflected/src/lifecycle.ts`

Duas interfaces opcionais que qualquer controller ou service pode implementar:

```typescript
interface OnApplicationBootstrap {
  onApplicationBootstrap(): Promise<void> | void
}

interface OnApplicationShutdown {
  onApplicationShutdown(signal?: string): Promise<void> | void
}
```

- `onApplicationBootstrap` → chamado pelo `controllerPlugin` após registrar todas as rotas
- `onApplicationShutdown` → chamado via `fastify.addHook("onClose", ...)` quando o servidor fecha

**Exemplo:**
```typescript
@Injectable()
@Controller("/cache")
export class CacheController implements OnApplicationBootstrap, OnApplicationShutdown {
  async onApplicationBootstrap() {
    await this.cacheService.connect();
  }
  async onApplicationShutdown(signal?: string) {
    await this.cacheService.disconnect();
  }
}
```

---

## 10. Auto-Discovery de Controllers

**Arquivo:** `packages/reflected/src/discovery.ts`

```typescript
async function discoverControllers(options: DiscoverOptions): Promise<void>

interface DiscoverOptions {
  patterns?: string[];   // padrão: ["**/*.controller.ts", "**/*.controller.js"]
  cwd: string;           // diretório base para busca (obrigatório)
  ignore?: string[];     // padrão: ["**/node_modules/**", "**/__tests__/**", "**/dist/**"]
}
```

Usa `fast-glob` para encontrar arquivos de controller e os importa dinamicamente. Ao importar, os decorators `@Controller` são executados e as classes são registradas no `registry`.

**Exemplo:**
```typescript
import path from "path";
import { discoverControllers } from "gtf-reflected-router";

await discoverControllers({
  cwd: path.join(__dirname, "modules"),
  // patterns: ["**/*.controller.ts"]  ← padrão automático
});
```

```typescript
function getRegisteredControllers(): Constructor[]
```

Retorna todas as classes registradas pelo `registry`.

---

## 11. Registry

**Arquivo:** `packages/reflected/src/registry.ts`

O `registry` é um singleton de `ControllerRegistry` — um `Set<Constructor>` que mantém todos os controllers registrados via `@Controller`.

```typescript
registry.register(target: Constructor): void
registry.getAll(): Constructor[]
registry.clear(): void
```

`getRegisteredControllers()` em `discovery.ts` é um wrapper de `registry.getAll()`.

---

## 12. Cron Jobs

**Arquivo:** `packages/reflected/src/cron.ts`

### `CRON_PATTERNS`

Constantes pré-definidas para expressões cron comuns:

```typescript
const CRON_PATTERNS = {
  EVERY_MINUTE:         "* * * * *",
  EVERY_5_MINUTES:      "*/5 * * * *",
  EVERY_15_MINUTES:     "*/15 * * * *",
  EVERY_30_MINUTES:     "*/30 * * * *",
  EVERY_HOUR:           "0 * * * *",
  EVERY_2_HOURS:        "0 */2 * * *",
  EVERY_6_HOURS:        "0 */6 * * *",
  EVERY_12_HOURS:       "0 */12 * * *",
  DAILY_MIDNIGHT:       "0 0 * * *",
  DAILY_NOON:           "0 12 * * *",
  WEEKLY_SUNDAY:        "0 0 * * 0",
  WEEKLY_MONDAY:        "0 0 * * 1",
  MONTHLY_FIRST_DAY:    "0 0 1 * *",
  YEARLY_JANUARY_FIRST: "0 0 1 1 *",
}
```

### Funções Utilitárias

```typescript
getCronJobs(target: object): CronJobMetadata[]
// Retorna todos os jobs registrados na classe

getCronJob(target: object, jobName: string): CronJobMetadata | undefined
// Retorna um job específico pelo nome

hasCronJobs(target: object): boolean
// Verifica se a classe tem jobs registrados

getActiveCronJobs(target: object): CronJobMetadata[]
// Retorna apenas jobs com options.enabled !== false

validateCronExpression(expression: string): void
// Valida expressão cron (lança Error se inválida)
// Suporta: *, ?, ranges (1-5), steps (*/5), listas (1,2,3), 5 ou 6 partes

validateCronJobOptions(options?: CronJobOptions): void
// Valida opções: maxConcurrency >= 1, timeout >= 1, priority 1-10, retryAttempts >= 0, retryDelay >= 0
```

### `executeCronJobSafely`

```typescript
async function executeCronJobSafely(
  jobMetadata: CronJobMetadata,
  instance: Record<string, unknown>,
  execution: CronJobExecution
): Promise<unknown>
```

Executa um cron job com:
- Suporte a timeout via `Promise.race`
- Retry automático (`retryAttempts` tentativas com `retryDelay` ms entre elas)
- Callbacks `onStart`, `onComplete`, `onError`
- Preenchimento do objeto `CronJobExecution` com status, timestamps e erros

**`CronJobExecution`:**
```typescript
interface CronJobExecution {
  jobName: string;
  startTime: Date;
  endTime?: Date;
  status: "running" | "completed" | "failed" | "timeout";
  error?: Error;
  result?: unknown;
  attempt: number;
}
```

---

## 13. Controller Plugin (Fastify)

**Arquivo:** `apps/server/src/core/plugins/controller-plugin.ts`

O `controllerPlugin` é o plugin Fastify que conecta todos os decorators ao framework. É o "motor" de execução.

```typescript
const controllerPlugin = fastifyPlugin(
  async (fastify: FastifyInstance, options: ControllerOptions) => { ... },
  { name: "controller-plugin" }
)

interface ControllerOptions {
  controllers?: any[];  // Se não fornecido, usa getRegisteredControllers()
  prefix?: string;      // Prefixo global (ex: "/api")
}
```

**Pipeline de execução por rota:**

```
1. Montar URL final: options.prefix + @Controller prefix + @Route path
2. Registrar fastify.route({ method, url, handler })
3. Em cada requisição:
   a. Criar ExecutionContext (request, reply, ControllerClass, handlerName)
   b. Executar Guards (classe + método) → 403 se falhar
   c. Resolver parâmetros (built-in + custom) com validação Zod se schema presente
   d. Executar Interceptors em cadeia (reduceRight)
   e. Invocar handler com args resolvidos
   f. Aplicar @HttpCode se definido
4. Após registrar rotas: chamar onApplicationBootstrap em todos os controllers
5. Em fastify.onClose: chamar onApplicationShutdown em todos os controllers
```

**Registro:**
```typescript
await app.register(controllerPlugin, { prefix: "/api" });
```

---

## 14. Tipos e Interfaces

**Arquivo:** `packages/reflected/src/types.ts`

```typescript
// Métodos HTTP suportados
const HTTP_METHODS = {
  GET: "GET", POST: "POST", PUT: "PUT",
  DELETE: "DELETE", PATCH: "PATCH", HEAD: "HEAD", OPTIONS: "OPTIONS"
}
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS"

// Metadados de uma rota
interface RouteMetadata {
  method: HttpMethod;
  path: string;
  handler: string;     // nome do método no controller
  options?: Omit<RouteOptions, "method" | "url" | "handler">;
}

// Tipos de parâmetro built-in
enum ParamType {
  BODY = "body",
  QUERY = "query",
  PARAM = "param",
  HEADERS = "headers",
  REQUEST = "request",
  REPLY = "reply",
}

// Interface mínima compatível com Zod
interface ZodLike {
  safeParse(data: unknown):
    | { success: true; data: unknown }
    | { success: false; error: { flatten(): unknown } }
}

// Metadados de parâmetro built-in
interface ParamMetadata {
  index: number;       // índice do parâmetro na assinatura do método
  type: ParamType;
  key?: string;        // chave específica (ex: "id" em @Param("id"))
  schema?: ZodLike;    // schema de validação
}

// Contexto de execução acessível em guards e interceptors
interface ExecutionContext {
  switchToHttp(): HttpArgumentsHost;
  getHandler(): Function;   // o método handler
  getClass(): Function;     // a classe controller
}

interface HttpArgumentsHost {
  getRequest<T = any>(): T;
  getReply<T = any>(): T;
}

// Fábrica de decorator customizado
type CustomParamFactory<TData, TResult> = (
  data: TData,
  ctx: ExecutionContext
) => TResult | Promise<TResult>

interface CustomParamMetadata<TData = any, TResult = any> {
  index: number;
  factory: CustomParamFactory<TData, TResult>;
  data?: TData;
}
```

---

## 15. Chaves de Metadados

**Arquivo:** `packages/reflected/src/metadata-keys.ts`

Todos os metadados usam `Symbol.for()` para garantir unicidade global:

| Constante | Symbol | Usado por |
|-----------|--------|-----------|
| `ROUTES_METADATA_KEY` | `"gtf:routes:metadata"` | `@Route` e variants |
| `REQUEST_PARAM_METADATA_KEY` | `"gtf:request-param:metadata"` | `@Request()` (deprecated) |
| `RESPONSE_PARAM_METADATA_KEY` | `"gtf:response-param:metadata"` | `@Response()` (deprecated) |
| `CONTROLLER_PREFIX_METADATA_KEY` | `"gtf:controller-prefix:metadata"` | `@Controller` |
| `CRON_JOBS_METADATA_KEY` | `"gtf:cron-jobs:metadata"` | `@CronJob` |
| `PARAM_METADATA_KEY` | `"gtf:param:metadata"` | `@Body`, `@Query`, `@Param`, etc. |
| `CUSTOM_PARAM_METADATA_KEY` | `"gtf:custom-param:metadata"` | `createParamDecorator` |
| `INJECTABLE_METADATA_KEY` | `"gtf:injectable:metadata"` | `@Injectable` |
| `GUARDS_METADATA_KEY` | `"gtf:guards:metadata"` | `@UseGuards` |
| `INTERCEPTORS_METADATA_KEY` | `"gtf:interceptors:metadata"` | `@UseInterceptors` |
| `HTTP_CODE_METADATA_KEY` | `"gtf:http-code:metadata"` | `@HttpCode` |

---

## 16. Exemplo Completo (app/server)

### Bootstrap (`apps/server/src/index.ts`)

```typescript
import "reflect-metadata";
import fastify from "fastify";
import { discoverControllers } from "gtf-reflected-router";
import { controllerPlugin } from "./core/plugins/controller-plugin";
import path from "path";

const app = fastify({ /* logger, etc. */ });

// Registrar plugins Fastify (cors, compress, swagger)
await registerPlugins(app);

// 1. Auto-descobrir todos os *.controller.ts em /modules
await discoverControllers({ cwd: path.join(__dirname, "modules") });

// 2. Registrar o plugin que monta todas as rotas com prefixo /api
await app.register(controllerPlugin, { prefix: "/api" });

await app.listen({ port: 8080, host: "0.0.0.0" });
```

### Controller com DI, Guard e Interceptor

```typescript
import { Controller, Get, Post, Delete, Param, Body, UseGuards, UseInterceptors, Injectable } from "gtf-reflected-router";
import { z } from "zod";

const CreateUserSchema = z.object({
  username: z.string().min(3),
  level: z.number().int().min(1),
  tag: z.string().startsWith("#"),
});

@Injectable()
@Controller("/users")
@UseInterceptors(LoggingInterceptor)    // intercepta todas as rotas
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  @Get("/")
  async getUsers() {
    return this.usersService.findAll();
  }

  @Get("/:id")
  async getUserById(@Param("id") id: string) {
    return this.usersService.findById(Number(id));
  }

  @Post("/")
  async createUser(@Body(CreateUserSchema) userData: z.infer<typeof CreateUserSchema>) {
    return this.usersService.create(userData);
  }

  @Delete("/:id")
  @UseGuards(AuthGuard)                 // guard apenas nesta rota
  async deleteUser(@Param("id") id: string) {
    return this.usersService.remove(Number(id));
  }
}
```

### Guard de Autenticação

```typescript
import { Injectable, Container } from "gtf-reflected-router";
import type { CanActivate, ExecutionContext } from "gtf-reflected-router";

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(" ")[1];
    if (!token) return false;
    return Container.get(AuthService).validateToken(token);
  }
}
```

### Interceptor de Logging

```typescript
import { Injectable } from "gtf-reflected-router";
import type { Interceptor, CallHandler, ExecutionContext } from "gtf-reflected-router";

@Injectable()
export class LoggingInterceptor implements Interceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<unknown> {
    const req = context.switchToHttp().getRequest();
    const start = Date.now();
    console.log(`→ ${req.method} ${req.url}`);
    const result = await next.handle();
    console.log(`← ${Date.now() - start}ms`);
    return result;
  }
}
```

### Cron Job com Lifecycle Hooks

```typescript
import { Injectable, CronJob, CRON_PATTERNS, getCronJobs, executeCronJobSafely } from "gtf-reflected-router";
import type { OnApplicationBootstrap, OnApplicationShutdown } from "gtf-reflected-router";

@Injectable()
export class Cron implements OnApplicationBootstrap, OnApplicationShutdown {
  private jobs: ReturnType<typeof setInterval>[] = [];

  @CronJob(CRON_PATTERNS.DAILY_MIDNIGHT, {
    description: "Backup diário à meia-noite",
    timezone: "America/Sao_Paulo",
    timeout: 10000,
    priority: 1,
  })
  async dailyBackup(): Promise<void> {
    console.log("Iniciando backup...");
  }

  async onApplicationBootstrap(): Promise<void> {
    const jobs = getCronJobs(Cron);
    for (const job of jobs) {
      await executeCronJobSafely(job, this, {
        jobName: job.name,
        startTime: new Date(),
        status: "running",
        attempt: 1,
      });
    }
  }

  onApplicationShutdown(signal?: string): void {
    for (const interval of this.jobs) clearInterval(interval);
    this.jobs = [];
  }
}
```

---

## 17. Fluxo de Execução de uma Requisição

```
HTTP Request
    │
    ▼
Fastify router (URL matching)
    │
    ▼
controllerPlugin handler
    │
    ├─► [1] createExecutionContext(request, reply, ControllerClass, handlerName)
    │
    ├─► [2] getGuards(Controller, handlerName)
    │       ├─ Guards de classe
    │       └─ Guards de método
    │       Para cada guard:
    │         resolveGuardInstance → Container.get(GuardClass) ou instância direta
    │         guard.canActivate(ctx)
    │         Se false → reply.status(403).send({ error: "Forbidden" }) e retorna
    │
    ├─► [3] Resolver parâmetros (se há decorators @Body, @Query, @Param, etc.)
    │       getParamMetadata(Controller, handler) → ParamMetadata[]
    │       getCustomParamMetadata(Controller, handler) → CustomParamMetadata[]
    │       Para cada ParamMetadata:
    │         extrair valor de request (body/query/params/headers/request/reply)
    │         se tem schema Zod → safeParse → 400 se inválido
    │       Para cada CustomParamMetadata:
    │         factory(data, ctx) → valor
    │
    ├─► [4] getInterceptors(Controller, handlerName)
    │       Construir cadeia via reduceRight
    │       interceptor1.intercept(ctx, { handle: → interceptor2.intercept(ctx, { handle: → ... invokeHandler }) })
    │
    ├─► [5] invokeHandler()
    │       controllerInstance[handlerName].call(instance, ...args)
    │
    ├─► [6] getHttpCode(Controller, handlerName)
    │       Se definido → reply.status(httpCode)
    │
    └─► [7] return result
```

---

## 18. Padrões e Dicas

### Estrutura de Módulo Recomendada

```
modules/
└── users/
    ├── users.controller.ts    # @Controller, rotas HTTP
    ├── users.service.ts       # @Injectable, lógica de negócio
    └── __tests__/
        └── user.controller.test.ts
```

### Validação com Zod

Passe o schema diretamente ao decorator de parâmetro. A validação acontece automaticamente no pipeline, retornando 400 com detalhes se falhar:

```typescript
const Schema = z.object({ name: z.string().min(1) });

@Post("/")
async create(@Body(Schema) data: z.infer<typeof Schema>) {
  // data já foi validado — tipos garantidos
}
```

### Guards vs Interceptors

| | Guard | Interceptor |
|---|---|---|
| **Quando executa** | Antes do handler | Antes E depois |
| **Pode bloquear** | Sim (retorna false → 403) | Não diretamente |
| **Acessa resultado** | Não | Sim |
| **Caso de uso** | Autenticação, autorização | Logging, cache, transformação |

### Injeção de Dependência — Regras

- Tipos primitivos (`number`, `string`, `boolean`) **não** podem ser injetados via construtor — use `@Inject(Token)` ou reestruture
- Interfaces TypeScript não existem em runtime — use classes concretas como tokens DI
- `@Controller` registra automaticamente no container; não precisa de `@Injectable` adicional
- `Container.get()` pode ser chamado manualmente em qualquer lugar (ex: dentro de guards)

### Auto-Discovery — Convenções

- Arquivos de controller **devem** ter o sufixo `.controller.ts` para serem descobertos automaticamente
- O `cwd` passado a `discoverControllers` deve apontar para a raiz dos módulos
- Discovery importa os arquivos dinâmicamente — os decorators são executados no import

### URL Final das Rotas

```
[options.prefix] + [@Controller prefix] + [@Route path]
    "/api"       +      "/users"        +     "/:id"
                 =     "/api/users/:id"
```

### Swagger / OpenAPI

O campo `options` de cada decorator de rota aceita `schema` do Fastify, compatível com `@fastify/swagger`:

```typescript
@Get("/", {
  schema: {
    tags: ["users"],
    summary: "Lista usuários",
    querystring: { type: "object", properties: { limit: { type: "number" } } },
    response: { 200: { type: "array", items: { $ref: "#/components/schemas/User" } } }
  }
})
```

### Testes

Para testes unitários de controllers, use `Container.clear()` no `beforeEach` para resetar o estado de singletons:

```typescript
import { Container } from "gtf-reflected-router";
import { registry } from "gtf-reflected-router";

beforeEach(() => {
  Container.clear();
  registry.clear();
});
```
