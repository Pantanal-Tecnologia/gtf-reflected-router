import { Get, Request, Response } from "@repo/gtf-reflected-router/src";
import type { FastifyReply, FastifyRequest } from "fastify";
import { Service } from "typedi";
import { users } from "../lib/users";

@Service()
export class UserController {
  @Get("/users", {
    schema: {
      tags: ["users"],
      summary: "Get all users",
      description: "Get all users",
      response: {
        200: {
          description: "Success",
          type: "array",
          properties: {
            id: {
              type: "number",
            },
            level: {
              type: "number",
            },
            username: {
              type: "string",
            },
            tag: {
              type: "string",
            },
          },
        },
      },
    },
  })
  async getUsers() {
    return users;
  }

  @Get("/users/:id", {
    schema: {
      tags: ["users"],
      summary: "Get user by id",
      description: "Get user by id",
      response: {
        200: {
          description: "Success",
          type: "object",
          properties: {
            id: {
              type: "number",
            },
            level: {
              type: "number",
            },
            username: {
              type: "string",
            },
            tag: {
              type: "string",
            },
          },
        },
        404: {
          description: "Not found",
        },
      },
    },
  })
  async getUserById(
    @Request() request: FastifyRequest<{ Params: { id: string } }>,
    @Response() reply: FastifyReply,
  ) {
    const { id } = request.params;

    const user = users.find((user) => user.id === Number(id));

    if (!user) {
      return reply.status(404).send({ message: "User not found" });
    }

    reply.status(200).send(user);
  }
}
