---
name: qa-testing-expert
description: Especialista em criação de testes unitários, testes automatizados, QA e detecção de falhas de segurança. Use esta skill SEMPRE que o usuário pedir para criar testes (unitários, integração, E2E), fazer code review com foco em segurança, auditar vulnerabilidades, gerar test suites, ou melhorar cobertura de testes. Também acione quando o usuário mencionar Jest, Vitest, Playwright, Cypress, pytest, PHPUnit, JUnit, testing-library, supertest, OWASP, pentest, XSS, SQL injection, CSRF, ou qualquer framework/conceito de teste e segurança. Acione mesmo para pedidos vagos como "testa isso pra mim", "esse código tá seguro?", "preciso de testes", "faz um review de segurança", "cobre esse componente com testes". Funciona com TypeScript, React, Node.js, Next.js, PHP, Android (Kotlin/Jetpack Compose), e Python.
---

# QA Testing Expert

Skill para criação de testes de alta qualidade e auditoria de segurança. Cobre todo o espectro de testes: unitários, integração, E2E, e análise de vulnerabilidades.

## Filosofia

Testes bons não são os que passam — são os que **quebram quando deveriam quebrar**. O objetivo não é inflar cobertura, é garantir confiança real no código. Cada teste deve justificar sua existência protegendo contra uma regressão concreta.

Segurança não é um checklist — é um mindset. Cada input do usuário é potencialmente hostil. Cada endpoint é uma superfície de ataque. Pense como um atacante para defender como um especialista.

## Workflow Principal

Ao receber código para testar ou auditar, siga esta sequência:

### 1. Análise Inicial

Leia o código e identifique:
- **Tipo do código**: componente UI, API endpoint, service/business logic, utility, middleware, hook
- **Stack**: detecte automaticamente (TS/JS → Jest/Vitest, React → testing-library, API → supertest, PHP → PHPUnit, Python → pytest, Kotlin → JUnit)
- **Dependências externas**: banco de dados, APIs, filesystem, serviços de terceiros
- **Superfícies de ataque**: inputs do usuário, autenticação, autorização, dados sensíveis

### 2. Geração de Testes

Gere testes seguindo a pirâmide de testes (muitos unitários, alguns de integração, poucos E2E). Para cada arquivo/módulo, crie um arquivo de teste correspondente.

#### Estrutura dos Testes

Use o padrão **AAA (Arrange, Act, Assert)** com nomes descritivos:

```
describe('[Módulo/Componente]', () => {
  describe('[método/comportamento]', () => {
    it('should [resultado esperado] when [condição]', () => {
      // Arrange - preparar dados e mocks
      // Act - executar a ação
      // Assert - verificar resultado
    });
  });
});
```

#### O que Testar (por prioridade)

1. **Happy path**: fluxo principal funciona corretamente
2. **Edge cases**: valores nulos, vazios, limites numéricos, strings longas
3. **Error handling**: exceções são tratadas, mensagens de erro são claras
4. **Boundary values**: limites de arrays, overflow, underflow
5. **Input validation**: tipos errados, formatos inválidos, injeções
6. **State transitions**: mudanças de estado, efeitos colaterais
7. **Concurrency**: race conditions, operações assíncronas
8. **Security**: autenticação, autorização, sanitização

### 3. Auditoria de Segurança

Para cada trecho de código, verifique as vulnerabilidades do checklist de segurança. Consulte `references/security-checklist.md` para o checklist completo OWASP-based.

### 4. Output

Gere os arquivos de teste e um relatório. O relatório deve conter:
- Resumo da cobertura de cenários (não métrica de cobertura de linhas, mas cobertura lógica de comportamentos)
- Vulnerabilidades encontradas com severidade (CRITICAL / HIGH / MEDIUM / LOW / INFO)
- Sugestões de melhoria no código original

---

## Regras por Stack

### TypeScript / Node.js / React

- **Framework padrão**: Vitest (preferido) ou Jest
- **React**: `@testing-library/react` + `@testing-library/user-event` — NUNCA teste detalhes de implementação, teste comportamento do usuário
- **API (Express/Fastify)**: `supertest` para testes de integração HTTP
- **Next.js**: teste Server Components com mocks de `next/headers`, API Routes com supertest, Client Components com testing-library
- **Mocking**: prefira dependency injection; quando não for possível, use `vi.mock()` / `jest.mock()`
- **Async**: sempre use `async/await` com matchers como `resolves` / `rejects`

Consulte `references/typescript-patterns.md` para patterns detalhados.

### PHP

- **Framework**: PHPUnit
- **Laravel**: use `TestCase`, `RefreshDatabase`, factories e `actingAs()` para auth
- **Mocking**: Mockery ou PHPUnit built-in mocks
- **DB**: sempre use transactions ou `RefreshDatabase` — testes nunca devem poluir o banco

Consulte `references/php-patterns.md` para patterns detalhados.

### Android (Kotlin / Jetpack Compose)

- **Unit**: JUnit 5 + MockK
- **Compose UI**: `createComposeRule()` com `onNodeWithText`, `performClick`
- **ViewModel**: teste flows com `Turbine`, use `TestDispatcher`
- **Room**: use in-memory database para testes

### Python

- **Framework**: pytest com fixtures
- **Async**: `pytest-asyncio`
- **Mocking**: `unittest.mock` ou `pytest-mock`
- **API (FastAPI/Flask)**: `TestClient` / `test_client()`

---

## Padrões de Mock

Mocks existem para isolar o que está sendo testado. Regras fundamentais:

1. **Mocke o que você NÃO controla** (APIs externas, banco, filesystem, tempo, randomness)
2. **NÃO mocke o que você está testando** — se você mockar a lógica sob teste, o teste é inútil
3. **Prefira fakes sobre mocks** quando possível (in-memory DB, fake API server)
4. **Verifique interações com parcimônia** — assertar que uma função foi chamada N vezes é frágil. Prefira assertar o resultado final
5. **Resete mocks entre testes** — estado compartilhado entre testes é o caminho mais rápido para flaky tests

---

## Segurança — Princípios Fundamentais

Ao auditar código, pense nestas categorias (baseado no OWASP Top 10):

| Categoria | O que procurar |
|-----------|---------------|
| **Injection** | SQL, NoSQL, OS command, LDAP — qualquer input concatenado em query/comando |
| **Broken Auth** | Tokens previsíveis, sessões que não expiram, falta de rate limiting |
| **Sensitive Data** | Dados em plain text, logs com PII, headers expondo info do servidor |
| **XXE** | Parsers XML sem desabilitar entidades externas |
| **Broken Access** | IDOR, falta de verificação de ownership, privilege escalation |
| **Misconfig** | Debug mode em prod, CORS permissivo, headers de segurança ausentes |
| **XSS** | Output sem sanitização, `dangerouslySetInnerHTML`, `innerHTML` |
| **Deserialization** | `eval()`, `JSON.parse` de input não validado, `unserialize()` em PHP |
| **Components** | Dependências com CVEs conhecidos |
| **Logging** | Falta de audit trail, logs insuficientes para detectar ataques |

Para o checklist completo com exemplos de código vulnerável vs seguro, consulte `references/security-checklist.md`.

---

## Formato de Output

### Para testes, gere arquivos `.test.ts` / `.test.php` / `_test.py` / `Test.kt`

Organize os testes no mesmo diretório ou em `__tests__/` conforme convenção do projeto. Se não houver convenção detectada, coloque ao lado do arquivo fonte com sufixo `.test.*`.

### Para auditoria de segurança, inclua um bloco de relatório

```
## 🔒 Relatório de Segurança

### Vulnerabilidades Encontradas

#### [CRITICAL] SQL Injection em `getUserById`
- **Arquivo**: src/services/user.service.ts:42
- **Descrição**: Input do usuário concatenado diretamente na query SQL
- **Impacto**: Atacante pode ler/modificar/deletar qualquer dado do banco
- **Fix sugerido**: Usar parameterized queries / prepared statements
- **Referência**: CWE-89

#### [HIGH] XSS Armazenado em `CommentSection`
- **Arquivo**: src/components/CommentSection.tsx:18
- **Descrição**: Uso de `dangerouslySetInnerHTML` com input do usuário sem sanitização
- **Impacto**: Atacante pode executar JavaScript arbitrário no browser de outros usuários
- **Fix sugerido**: Usar DOMPurify para sanitizar ou evitar innerHTML
- **Referência**: CWE-79

### Resumo
| Severidade | Quantidade |
|-----------|-----------|
| CRITICAL  | 1         |
| HIGH      | 1         |
| MEDIUM    | 0         |
| LOW       | 0         |
```

---

## Anti-Patterns a Evitar nos Testes

Estes são erros comuns que a skill deve NUNCA cometer:

1. **Testar implementação, não comportamento** — não assertar que `setState` foi chamado; assertar que o texto mudou na tela
2. **Testes que sempre passam** — se o teste não pode falhar, ele não testa nada. Verifique fazendo mentalmente a pergunta: "se eu deletar a linha X do código, esse teste quebra?"
3. **Snapshots indiscriminados** — snapshots viram ruído. Use apenas para output estável e pequeno (ex: um ícone SVG)
4. **Mocks excessivos** — se você mockou tudo, está testando seus mocks, não seu código
5. **Testes acoplados** — a ordem dos testes NUNCA deve importar. Cada teste deve ser independente
6. **Dados hardcoded frágeis** — use factories/builders. `createUser({ role: 'admin' })` > `{ id: 1, name: 'John', email: 'john@test.com', role: 'admin', ... }`
7. **Ignorar testes assíncronos** — promise não resolvida = teste que passa mas não testou nada

---

## Referências

Para patterns detalhados e exemplos por stack, consulte:
- `references/typescript-patterns.md` — Patterns para TS/React/Node/Next.js
- `references/php-patterns.md` — Patterns para PHP/Laravel
- `references/security-checklist.md` — Checklist de segurança OWASP-based completo