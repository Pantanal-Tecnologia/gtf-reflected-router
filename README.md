# GTF Reflected Router

A TypeScript library that provides decorators for defining and managing Fastify routes in a clean, declarative way.

## Installation

```bash
# Using npm
npm install gtf-reflected-router

# Using yarn
yarn add  gtf-reflected-router

# Using pnpm
pnpm add  gtf-reflected-router
```

## Features

- TypeScript decorators for all standard HTTP methods
- Type-safe route definitions
- Automatic route registration
- Compatible with Fastify's route options
- Prevents duplicate routes
- Parameter decorators for request and response objects

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

## Requirements

- TypeScript 4.5+
- reflect-metadata
- Fastify 5.x

## Testing

The project includes a comprehensive test suite using Jest. Tests are organized into unit tests and integration tests.

### Running Tests

```bash
# Navigate to the server app
cd apps/server

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Structure

- Unit tests for controllers and plugins
- Integration tests for API endpoints
- Detailed documentation in `apps/server/src/__tests__/README.md`

For more information about the testing approach and how to write new tests, see the [Testing Documentation](apps/server/src/__tests__/README.md).
