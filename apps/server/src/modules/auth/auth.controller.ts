import { Post, Body, Controller } from "gtf-reflected-router";
import { Injectable } from "gtf-reflected-router";
import { AuthService } from "./auth.service";
import { z } from "zod";

const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

@Injectable()
@Controller("/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("/login", {
    schema: {
      tags: ["auth"],
      summary: "Login to the application",
      body: {
        type: "object",
        required: ["username", "password"],
        properties: {
          username: { type: "string" },
          password: { type: "string" },
        },
      },
    },
  })
  async login(@Body(LoginSchema) body: z.infer<typeof LoginSchema>) {
    return this.authService.login(body.username);
  }
}
