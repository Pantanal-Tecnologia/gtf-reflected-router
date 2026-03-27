import { Injectable } from "gtf-reflected-router";
import type { Interceptor, CallHandler } from "gtf-reflected-router";
import type { ExecutionContext } from "gtf-reflected-router";

@Injectable()
export class LoggingInterceptor implements Interceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<unknown> {
    const request = context.switchToHttp().getRequest();
    const now = Date.now();

    console.log(`[LoggingInterceptor] Before ${request.method} ${request.url}`);

    const result = await next.handle();

    const delay = Date.now() - now;
    console.log(`[LoggingInterceptor] After ${request.method} ${request.url} - ${delay}ms`);

    return result;
  }
}
