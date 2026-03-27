import "reflect-metadata";
import { registry } from "../../src/registry.js";
import { getRegisteredControllers } from "../../src/discovery.js";
import { Controller, Get } from "../../src/decorators.js";

beforeEach(() => {
  registry.clear();
});

describe("getRegisteredControllers", () => {
  it("returns empty array when no controllers registered", () => {
    expect(getRegisteredControllers()).toHaveLength(0);
  });

  it("returns controllers registered via @Controller", () => {
    @Controller("/items")
    class ItemController {
      @Get("/")
      list() {}
    }

    const controllers = getRegisteredControllers();
    expect(controllers).toContain(ItemController);
  });

  it("returns multiple registered controllers", () => {
    @Controller("/a")
    class ControllerA {}

    @Controller("/b")
    class ControllerB {}

    const controllers = getRegisteredControllers();
    expect(controllers).toContain(ControllerA);
    expect(controllers).toContain(ControllerB);
  });
});
