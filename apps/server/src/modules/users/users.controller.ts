import {
  Get,
  Post,
  Delete,
  Param,
  Body,
  Controller,
  UseGuards,
  UseInterceptors,
  Injectable,
  Inject,
} from "gtf-reflected-router";
import { UsersService } from "./users.service"; // regular import required for emitDecoratorMetadata DI reflection
import { AuthGuard } from "../../core/guards/auth.guard";
import { LoggingInterceptor } from "../../core/interceptors/logging.interceptor";
import { z } from "zod";

const CreateUserSchema = z.object({
  username: z.string().min(3),
  level: z.number().int().min(1),
  tag: z.string().startsWith("#"),
});

@Injectable()
@Controller("/users")
@UseInterceptors(LoggingInterceptor)
export class UserController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Get("/", {
    schema: {
      tags: ["users"],
      summary: "Get all users",
      response: {
        200: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "number" },
              level: { type: "number" },
              username: { type: "string" },
              tag: { type: "string" },
            },
          },
        },
      },
    },
  })
  async getUsers() {
    return this.usersService.findAll();
  }

  @Get("/:id", {
    schema: {
      tags: ["users"],
      summary: "Get user by id",
      params: {
        type: "object",
        properties: {
          id: { type: "number" },
        },
      },
    },
  })
  async getUserById(@Param("id") id: string) {
    const user = await this.usersService.findById(Number(id));
    if (!user) {
      return { message: "User not found" };
    }
    return user;
  }

  @Post("/", {
    schema: {
      tags: ["users"],
      summary: "Create a new user",
      body: {
        type: "object",
        required: ["username", "level", "tag"],
        properties: {
          username: { type: "string" },
          level: { type: "number" },
          tag: { type: "string" },
        },
      },
    },
  })
  async createUser(@Body(CreateUserSchema) userData: z.infer<typeof CreateUserSchema>) {
    return this.usersService.create(userData);
  }

  @Delete("/:id", {
    schema: {
      tags: ["users"],
      summary: "Delete user by id",
    },
  })
  @UseGuards(AuthGuard)
  async deleteUser(@Param("id") id: string) {
    const removed = await this.usersService.remove(Number(id));
    if (!removed) {
      return { message: "User not found" };
    }
    return { message: "User deleted", user: removed };
  }
}
