# GTF Router Handler

A TypeScript library that provides decorators for defining and managing Fastify routes in a clean, declarative way.

## Installation

```bash
# Using npm
npm install https://github.com/Pantanal-Tecnologia/gtf-reflected-router

# Using yarn
yarn add  https://github.com/Pantanal-Tecnologia/gtf-reflected-router

# Using pnpm
pnpm add  https://github.com/Pantanal-Tecnologia/gtf-reflected-router
```

## Features

- TypeScript decorators for all standard HTTP methods
- Type-safe route definitions
- Automatic route registration
- Compatible with Fastify's route options
- Prevents duplicate routes
- Parameter decorators for request and response objects
- Plugin decorators for Fastify plugins

## Usage

### Basic Example

```typescript
import { Get, Post, getRoutes } from 'gtf-router-handler';
import fastify from 'fastify';

const app = fastify();

class UserController {
  @Get('/users')
  async getAllUsers(request, reply) {
    return { users: ['John', 'Jane', 'Bob'] };
  }

  @Get('/users/:id')
  async getUserById(request, reply) {
    const { id } = request.params;
    return { id, name: 'John Doe' };
  }

  @Post('/users')
  async createUser(request, reply) {
    // Create a new user
    return { success: true, user: request.body };
  }
}

// Register routes with Fastify
const userController = new UserController();
const routes = getRoutes(UserController);

routes.forEach(route => {
  app.route({
    method: route.method,
    url: route.path,
    handler: userController[route.handler].bind(userController),
    ...route.options
  });
});

app.listen({ port: 3000 });
```

### Using Route Options

```typescript
import { Post } from 'gtf-router-handler';

class ProductController {
  @Post('/products', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'price'],
        properties: {
          name: { type: 'string' },
          price: { type: 'number' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' }
          }
        }
      }
    }
  })
  async createProduct(request, reply) {
    // Create product with validation from schema
    return { id: '123', ...request.body };
  }
}
```

### Using Parameter Decorators

```typescript
import { Get, Post, Request, Response } from 'gtf-router-handler';
import { FastifyRequest } from 'fastify';
import { FastifyReply } from 'fastify/types/reply';

class UserController {
  @Get('/users/:id')
  async getUser(@Request() req: FastifyRequest) {
    const { id } = req.params;
    return { id, name: 'John Doe' };
  }

  @Post('/users')
  async createUser(@Request() req: FastifyRequest, @Response() reply: FastifyReply) {
    // Create a new user
    reply.code(201);
    return { success: true, user: req.body };
  }
}
```

## API Reference

### HTTP Method Decorators

- `@Get(path, options?)` - Register a GET route
- `@Post(path, options?)` - Register a POST route
- `@Put(path, options?)` - Register a PUT route
- `@Delete(path, options?)` - Register a DELETE route
- `@Patch(path, options?)` - Register a PATCH route
- `@Head(path, options?)` - Register a HEAD route
- `@Options(path, options?)` - Register an OPTIONS route

### Generic Route Decorator

```typescript
// @Route(method, path, options?)
function exampleRoute() {
  // This is just an example of how to use the Route decorator
  Route('GET', '/example', { schema: { response: { 200: { type: 'object' } } } });
}
```

Parameters:
- `method`: HTTP method (GET, POST, PUT, etc.)
- `path`: Route path (must start with '/')
- `options`: Fastify route options (excluding method, url, and handler)

### Parameter Decorators

- `@Request()` - Injects the FastifyRequest object into the parameter
- `@Response()` - Injects the FastifyReply object into the parameter

### Utility Functions

- `getRoutes(targetClass)`: Retrieves all route metadata from a controller class
- `getRequestParams(target, propertyKey)`: Gets the indices of parameters marked with @Request decorator
- `getResponseParams(target, propertyKey)`: Gets the indices of parameters marked with @Response decorator

### Plugin Decorators

- `@Plugin(options?)` - Marks a class as a Fastify plugin
- `@BeforeRequest()` - Marks a method to be executed before a request is processed
- `@AfterRequest()` - Marks a method to be executed after a request is processed

### Plugin Utility Functions

- `isPlugin(targetClass)`: Checks if a class is marked as a plugin
- `getPluginMetadata(targetClass)`: Retrieves plugin metadata from a class
- `getBeforeRequestHooks(targetClass)`: Gets all methods marked with @BeforeRequest
- `getAfterRequestHooks(targetClass)`: Gets all methods marked with @AfterRequest

### Plugin Example

```typescript
import { Plugin, BeforeRequest, AfterRequest } from 'gtf-router-handler';
import { FastifyRequest, FastifyReply } from 'fastify';

@Plugin()
export class LoggerPlugin {
  @BeforeRequest()
  async logRequest(request: FastifyRequest, reply: FastifyReply) {
    console.log(`Request received: ${request.method} ${request.url}`);
  }

  @AfterRequest()
  async logResponse(request: FastifyRequest, reply: FastifyReply) {
    console.log(`Response sent with status: ${reply.statusCode}`);
  }
}

// In your Fastify application:
import fastify from 'fastify';
import { LoggerPlugin, getBeforeRequestHooks, getAfterRequestHooks } from 'gtf-router-handler';

const app = fastify();
const loggerPlugin = new LoggerPlugin();

// Register hooks
const beforeHooks = getBeforeRequestHooks(LoggerPlugin);
beforeHooks.forEach(hook => {
  app.addHook('onRequest', async (request, reply) => {
    await loggerPlugin[hook.handler](request, reply);
  });
});

const afterHooks = getAfterRequestHooks(LoggerPlugin);
afterHooks.forEach(hook => {
  app.addHook('onResponse', async (request, reply) => {
    await loggerPlugin[hook.handler](request, reply);
  });
});

app.listen({ port: 3000 });
```

## Requirements

- TypeScript 4.5+
- reflect-metadata
- Fastify 5.x
