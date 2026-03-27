import { Injectable, Container } from "gtf-reflected-router";
import type { CanActivate, ExecutionContext } from "gtf-reflected-router";
import { AuthService } from "../../modules/auth/auth.service";

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return false;
    }

    const token = authHeader.split(" ")[1];
    const authService = Container.get(AuthService);
    return authService.validateToken(token);
  }
}
