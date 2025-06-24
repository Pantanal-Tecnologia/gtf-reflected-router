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
@Route(method, path, options?)
```

Parameters:
- `method`: HTTP method (GET, POST, PUT, etc.)
- `path`: Route path (must start with '/')
- `options`: Fastify route options (excluding method, url, and handler)

### Utility Functions

- `getRoutes(targetClass)`: Retrieves all route metadata from a controller class

## Requirements

- TypeScript 4.5+
- reflect-metadata
- Fastify 5.x
