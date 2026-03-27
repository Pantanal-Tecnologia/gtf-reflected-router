import "reflect-metadata";
import { UseInterceptors, getInterceptors } from "../../src/interceptors.js";
import { Controller, Get } from "../../src/decorators.js";
import { registry } from "../../src/registry.js";
import { Container } from "../../src/container.js";
import type { Interceptor, CallHandler } from "../../src/interceptors.js";
import type { ExecutionContext } from "../../src/types.js";

beforeEach(() => {
  registry.clear();
  Container.clear();
});

class LoggingInterceptor implements Interceptor {
  async intercept(_ctx: ExecutionContext, next: CallHandler) {
    return next.handle();
  }
}

class TimingInterceptor implements Interceptor {
  async intercept(_ctx: ExecutionContext, next: CallHandler) {
    return next.handle();
  }
}

describe("@UseInterceptors", () => {
  describe("class-level", () => {
    it("stores interceptors on the controller class", () => {
      @UseInterceptors(LoggingInterceptor)
      @Controller("/test")
      class TestController {}

      const interceptors = getInterceptors(TestController);
      expect(interceptors).toContain(LoggingInterceptor);
    });
  });

  describe("method-level", () => {
    it("stores interceptors on a specific method", () => {
      @Controller("/test")
      class TestController {
        @UseInterceptors(TimingInterceptor)
        @Get("/timed")
        timed() {}

        @Get("/plain")
        plain() {}
      }

      const timedInterceptors = getInterceptors(TestController, "timed");
      const plainInterceptors = getInterceptors(TestController, "plain");

      expect(timedInterceptors).toContain(TimingInterceptor);
      expect(plainInterceptors).toHaveLength(0);
    });
  });

  describe("getInterceptors", () => {
    it("merges class-level and method-level interceptors", () => {
      @UseInterceptors(LoggingInterceptor)
      @Controller("/test")
      class TestController {
        @UseInterceptors(TimingInterceptor)
        @Get("/")
        handler() {}
      }

      const interceptors = getInterceptors(TestController, "handler");
      expect(interceptors).toContain(LoggingInterceptor);
      expect(interceptors).toContain(TimingInterceptor);
      expect(interceptors).toHaveLength(2);
    });

    it("accepts interceptor instances (not just constructors)", () => {
      const interceptorInstance: Interceptor = {
        intercept: async (_ctx, next) => next.handle(),
      };

      @UseInterceptors(interceptorInstance)
      @Controller("/test")
      class TestController {}

      const interceptors = getInterceptors(TestController);
      expect(interceptors).toContain(interceptorInstance);
    });
  });
});
