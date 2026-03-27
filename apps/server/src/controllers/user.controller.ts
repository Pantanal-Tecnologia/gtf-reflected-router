import { Get, Param, Req, Controller } from "../../../../packages/reflected/src/index.js";
import type { FastifyRequest } from "fastify";
import { Injectable } from "../../../../packages/reflected/src/container.js";
import { users } from "../lib/users.js";

@Injectable()
@Controller("/users")
export class UserController {
  @Get("/", {
    schema: {
      tags: ["users"],
      summary: "Get all users",
      description: "Get all users",
      response: {
        200: {
          description: "Success",
          type: "array",
          properties: {
            id: { type: "number" },
            level: { type: "number" },
            username: { type: "string" },
            tag: { type: "string" },
          },
        },
      },
    },
  })
  async getUsers() {
    return users;
  }

  @Get("/:id", {
    schema: {
      tags: ["users"],
      summary: "Get user by id",
      description: "Get user by id",
      response: {
        200: {
          description: "Success",
          type: "object",
          properties: {
            id: { type: "number" },
            level: { type: "number" },
            username: { type: "string" },
            tag: { type: "string" },
          },
        },
        404: { description: "Not found" },
      },
    },
  })
  async getUserById(@Param("id") id: string, @Req() request: FastifyRequest) {
    const user = users.find((u) => u.id === Number(id));

    if (!user) {
      return { message: "User not found" };
    }

    return user;
  }
}
