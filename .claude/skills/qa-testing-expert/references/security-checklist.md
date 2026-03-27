# Security Checklist — OWASP-Based

Checklist completo para auditoria de segurança em aplicações web. Use como referência ao auditar código.

## Table of Contents
1. [Injection](#1-injection)
2. [Broken Authentication](#2-broken-authentication)
3. [Sensitive Data Exposure](#3-sensitive-data-exposure)
4. [Broken Access Control](#4-broken-access-control)
5. [XSS (Cross-Site Scripting)](#5-xss)
6. [CSRF (Cross-Site Request Forgery)](#6-csrf)
7. [Security Misconfiguration](#7-security-misconfiguration)
8. [Insecure Dependencies](#8-insecure-dependencies)
9. [API Security](#9-api-security)
10. [Logging & Monitoring](#10-logging-monitoring)
11. [File Upload](#11-file-upload)
12. [Environment & Secrets](#12-environment-secrets)

---

## 1. Injection

### SQL Injection

**Vulnerável:**
```typescript
// NUNCA faça isso
const user = await db.query(`SELECT * FROM users WHERE id = '${req.params.id}'`)
```

**Seguro:**
```typescript
// Parameterized query
const user = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id])

// Drizzle ORM (seguro por padrão)
const user = await db.select().from(users).where(eq(users.id, req.params.id))
```

### NoSQL Injection

**Vulnerável:**
```typescript
// Input: { "username": { "$ne": null }, "password": { "$ne": null } }
const user = await User.findOne({ username: req.body.username, password: req.body.password })
```

**Seguro:**
```typescript
// Validar tipos antes
const username = String(req.body.username)
const password = String(req.body.password)
const user = await User.findOne({ username, password })
```

### Command Injection

**Vulnerável:**
```typescript
exec(`convert ${req.query.filename} output.png`) // RCE!
```

**Seguro:**
```typescript
import { execFile } from 'child_process'
execFile('convert', [sanitizedFilename, 'output.png'])
```

### O que verificar:
- [ ] Nenhum input do usuário é concatenado em queries SQL/NoSQL
- [ ] Todos os queries usam parameterized/prepared statements ou ORM
- [ ] `exec()`, `eval()`, `Function()` nunca recebem input do usuário
- [ ] Template literals em queries são sinais de alerta

---

## 2. Broken Authentication

### O que verificar:
- [ ] Passwords são hasheados com bcrypt/argon2 (NUNCA MD5/SHA1/SHA256 plain)
- [ ] Rate limiting no endpoint de login (ex: max 5 tentativas / minuto)
- [ ] Tokens JWT têm expiração curta (15min access, 7d refresh)
- [ ] Refresh tokens são armazenados de forma segura (httpOnly cookie, não localStorage)
- [ ] Logout invalida tokens no servidor (não apenas remove do client)
- [ ] Reset de senha usa tokens de uso único com expiração
- [ ] Enumeration de usuários é prevenida (mesma resposta para email existente e não existente)
- [ ] MFA é suportado para operações sensíveis

**Vulnerável:**
```typescript
// Permite enumeration
if (!user) return res.status(404).json({ error: 'User not found' })
if (!validPassword) return res.status(401).json({ error: 'Wrong password' })
```

**Seguro:**
```typescript
// Mesma resposta para ambos os casos
if (!user || !validPassword) {
  return res.status(401).json({ error: 'Invalid credentials' })
}
```

---

## 3. Sensitive Data Exposure

### O que verificar:
- [ ] Dados sensíveis (PII, cartões, tokens) NÃO aparecem em logs
- [ ] Respostas de API não retornam campos sensíveis (password hash, tokens internos)
- [ ] Headers HTTP de segurança estão configurados (ver seção 7)
- [ ] Dados em trânsito usam HTTPS/TLS
- [ ] Dados em repouso são criptografados (especialmente em banco)
- [ ] Backups são criptografados
- [ ] Stack traces não são expostos em produção

**Vulnerável:**
```typescript
console.log('User login:', { email, password, token }) // PII no log!

app.use((err, req, res, next) => {
  res.status(500).json({ error: err.stack }) // stack trace em prod!
})
```

**Seguro:**
```typescript
logger.info('User login attempt', { email: maskEmail(email) })

app.use((err, req, res, next) => {
  logger.error('Internal error', { error: err.message, requestId: req.id })
  res.status(500).json({ error: 'Internal server error', requestId: req.id })
})
```

---

## 4. Broken Access Control

### IDOR (Insecure Direct Object Reference)

**Vulnerável:**
```typescript
// Qualquer user autenticado pode ver qualquer pedido
app.get('/api/orders/:id', auth, async (req, res) => {
  const order = await Order.findById(req.params.id)
  res.json(order)
})
```

**Seguro:**
```typescript
app.get('/api/orders/:id', auth, async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user.id, // verifica ownership
  })
  if (!order) return res.status(404).json({ error: 'Not found' })
  res.json(order)
})
```

### O que verificar:
- [ ] Toda rota protegida verifica autenticação E autorização
- [ ] Acesso a recursos verifica ownership (o usuário X pode ver o recurso Y?)
- [ ] IDs previsíveis (auto-increment) não são usados como único controle de acesso
- [ ] Privilege escalation é impossível (user não pode se tornar admin via API)
- [ ] Vertical access control: roles são verificados no servidor, não no client
- [ ] Horizontal access control: user A não acessa dados do user B

---

## 5. XSS

### O que verificar:
- [ ] `dangerouslySetInnerHTML` é usado APENAS com DOMPurify
- [ ] `innerHTML` nunca recebe input do usuário
- [ ] Output é escapado por padrão (React faz isso, mas atenção com exceções)
- [ ] URLs são validadas antes de uso em `href` (prevenir `javascript:`)
- [ ] Content-Security-Policy header está configurado
- [ ] Cookies sensíveis têm flag `httpOnly`

**Vulnerável (React):**
```tsx
// XSS via dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userComment }} />

// XSS via href
<a href={userProvidedUrl}>Link</a> // javascript:alert(1)
```

**Seguro:**
```tsx
import DOMPurify from 'dompurify'
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userComment) }} />

// Validar protocolo
const isValidUrl = (url: string) => {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch { return false }
}
```

---

## 6. CSRF

### O que verificar:
- [ ] Endpoints mutantes (POST/PUT/DELETE) requerem CSRF token
- [ ] SameSite cookie attribute está configurado (`Strict` ou `Lax`)
- [ ] CORS está configurado corretamente (não `*` com credentials)
- [ ] Cookies de sessão não são enviados cross-origin

---

## 7. Security Misconfiguration

### Headers HTTP obrigatórios:

```typescript
// Com helmet.js (Express)
import helmet from 'helmet'
app.use(helmet())

// Ou manualmente:
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '0') // desabilitado (CSP é melhor)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  res.setHeader('Content-Security-Policy', "default-src 'self'")
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
})
```

### O que verificar:
- [ ] Debug mode desabilitado em produção
- [ ] Mensagens de erro genéricas em produção
- [ ] Headers de segurança configurados
- [ ] CORS restrito (não `origin: '*'` com `credentials: true`)
- [ ] Versão do servidor não é exposta (`X-Powered-By` removido)
- [ ] Diretórios sensíveis (.git, .env, node_modules) não são servidos

---

## 8. Insecure Dependencies

### O que verificar:
- [ ] `npm audit` / `composer audit` / `pip audit` sem vulnerabilidades HIGH/CRITICAL
- [ ] Lockfile (package-lock.json / composer.lock) está commitado
- [ ] Dependências não são importadas de sources não confiáveis
- [ ] Dependabot ou Renovate está configurado para updates automáticos

---

## 9. API Security

### O que verificar:
- [ ] Rate limiting em todos os endpoints públicos
- [ ] Input validation com schema (zod, joi, yup) em todo input do usuário
- [ ] Paginação tem limite máximo (não permitir `?limit=999999`)
- [ ] Respostas de API não retornam mais dados que o necessário (overfetching)
- [ ] GraphQL: depth limiting e query complexity analysis
- [ ] Uploads têm limite de tamanho
- [ ] Timeout configurado para requests externos

**Vulnerável:**
```typescript
app.get('/api/users', async (req, res) => {
  const limit = req.query.limit // pode ser 999999!
  const users = await db.select().from(users).limit(limit)
  res.json(users) // retorna TODOS os campos incluindo passwordHash
})
```

**Seguro:**
```typescript
app.get('/api/users', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100) // max 100
  const users = await db
    .select({ id: users.id, name: users.name, email: users.email }) // campos específicos
    .from(users)
    .limit(limit)
  res.json(users)
})
```

---

## 10. Logging & Monitoring

### O que verificar:
- [ ] Tentativas de login falhadas são logadas
- [ ] Ações administrativas são logadas com audit trail
- [ ] Logs NÃO contêm dados sensíveis (passwords, tokens, PII)
- [ ] Alertas configurados para padrões suspeitos (brute force, mass enumeration)
- [ ] Log de acesso a dados sensíveis (quem acessou o quê e quando)

---

## 11. File Upload

### O que verificar:
- [ ] Tipo do arquivo é validado por magic bytes, não apenas pela extensão
- [ ] Tamanho máximo é enforçado
- [ ] Arquivos são renomeados (nunca usar o nome original do usuário)
- [ ] Uploads vão para diretório fora do webroot / bucket separado
- [ ] Antivirus scan em uploads (se aplicável)
- [ ] Imagens são re-processadas (strip metadata, resize) para prevenir image-based attacks

---

## 12. Environment & Secrets

### O que verificar:
- [ ] `.env` está no `.gitignore`
- [ ] Secrets não estão hardcoded no código
- [ ] Secrets diferentes para cada ambiente (dev/staging/prod)
- [ ] API keys têm permissões mínimas necessárias
- [ ] Secrets são rotacionados periodicamente
- [ ] Secrets comprometidos são revogados imediatamente

### Severidade por Categoria

| Vulnerabilidade | Severidade Típica |
|----------------|-------------------|
| SQL/Command Injection | CRITICAL |
| Broken Authentication (bypass) | CRITICAL |
| IDOR com dados sensíveis | HIGH |
| XSS Armazenado | HIGH |
| CSRF em ações destrutivas | HIGH |
| Sensitive Data em logs | MEDIUM-HIGH |
| Missing rate limiting | MEDIUM |
| Missing security headers | MEDIUM |
| XSS Refletido | MEDIUM |
| Outdated dependencies (known CVE) | Depende do CVE |
| Missing HTTPS | HIGH |
| Debug mode em prod | MEDIUM |
| Verbose error messages | LOW-MEDIUM |