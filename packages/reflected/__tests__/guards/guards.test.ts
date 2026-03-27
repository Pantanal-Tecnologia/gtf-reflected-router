import "reflect-metadata";
import { UseGuards, getGuards } from "../../src/guards.js";
import { Controller, Get } from "../../src/decorators.js";
import { registry } from "../../src/registry.js";
import { Container } from "../../src/container.js";
import type { CanActivate } from "../../src/guards.js";
import type { ExecutionContext } from "../../src/types.js";

beforeEach(() => {
  registry.clear();
  Container.clear();
});

class AlwaysAllowGuard implements CanActivate {
  canActivate(_ctx: ExecutionContext) {
    return true;
  }
}

class AlwaysDenyGuard implements CanActivate {
  canActivate(_ctx: ExecutionContext) {
    return false;
  }
}

describe("@UseGuards", () => {
  describe("class-level", () => {
    it("stores guards on the controller class", () => {
      @UseGuards(AlwaysAllowGuard)
      @Controller("/test")
      class TestController {}

      const guards = getGuards(TestController);
      expect(guards).toContain(AlwaysAllowGuard);
    });

    it("stores multiple guards", () => {
      @UseGuards(AlwaysAllowGuard, AlwaysDenyGuard)
      @Controller("/test")
      class TestController {}

      const guards = getGuards(TestController);
      expect(guards).toHaveLength(2);
    });
  });

  describe("method-level", () => {
    it("stores guards on a specific method", () => {
      @Controller("/test")
      class TestController {
        @UseGuards(AlwaysDenyGuard)
        @Get("/secure")
        secure() {}

        @Get("/open")
        open() {}
      }

      const secureGuards = getGuards(TestController, "secure");
      const openGuards = getGuards(TestController, "open");

      expect(secureGuards).toContain(AlwaysDenyGuard);
      expect(openGuards).toHaveLength(0);
    });
  });

  describe("getGuards", () => {
    it("merges class-level and method-level guards", () => {
      @UseGuards(AlwaysAllowGuard)
      @Controller("/test")
      class TestController {
        @UseGuards(AlwaysDenyGuard)
        @Get("/")
        handler() {}
      }

      const guards = getGuards(TestController, "handler");
      expect(guards).toContain(AlwaysAllowGuard);
      expect(guards).toContain(AlwaysDenyGuard);
      expect(guards).toHaveLength(2);
    });

    it("accepts guard instances (not just constructors)", () => {
      const guardInstance: CanActivate = {
        canActivate: () => true,
      };

      @UseGuards(guardInstance)
      @Controller("/test")
      class TestController {}

      const guards = getGuards(TestController);
      expect(guards).toContain(guardInstance);
    });
  });
});
