import "reflect-metadata";
import { HttpCode, getHttpCode, Post, Get } from "../../src/decorators.js";

describe("@HttpCode", () => {
  it("stores status code on a method", () => {
    class TestController {
      @HttpCode(201)
      @Post("/")
      create() {}
    }

    const code = getHttpCode(TestController, "create");
    expect(code).toBe(201);
  });

  it("returns undefined for methods without @HttpCode", () => {
    class TestController {
      @Get("/")
      list() {}
    }

    const code = getHttpCode(TestController, "list");
    expect(code).toBeUndefined();
  });

  it("supports different status codes", () => {
    class TestController {
      @HttpCode(204)
      @Post("/delete")
      remove() {}
    }

    expect(getHttpCode(TestController, "remove")).toBe(204);
  });
});
