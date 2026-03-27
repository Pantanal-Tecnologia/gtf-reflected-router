import "reflect-metadata";
import { FastifyInstance } from "fastify";
import { controllerPlugin } from "../controller-plugin.js";
import { Container } from "../../../../../packages/reflected/src/container.js";
import { Controller, Get } from "../../../../../packages/reflected/src/decorators.js";

@Controller("/items")
class MockController {
  @Get("/")
  list() {
    return [{ id: 1 }];
  }

  @Get("/:id")
  getById() {
    return { id: 1 };
  }
}

describe("Controller Plugin", () => {
  let mockFastify: FastifyInstance;

  beforeEach(() => {
    Container.clear();
    Container.register(MockController);

    mockFastify = {
      route: jest.fn(),
      addHook: jest.fn(),
      register: jest.fn().mockImplementation((plugin, options) => plugin(mockFastify, options)),
    } as unknown as FastifyInstance;
  });

  it("registers routes from controllers with prefix + controller prefix", async () => {
    await controllerPlugin(mockFastify, {
      controllers: [MockController],
      prefix: "/api",
    });

    expect(mockFastify.route).toHaveBeenCalledTimes(2);
    expect(mockFastify.route).toHaveBeenCalledWith(
      expect.objectContaining({ method: "GET", url: "/api/items/" }),
    );
    expect(mockFastify.route).toHaveBeenCalledWith(
      expect.objectContaining({ method: "GET", url: "/api/items/:id" }),
    );
  });

  it("uses empty prefix if not provided", async () => {
    await controllerPlugin(mockFastify, { controllers: [MockController] });

    expect(mockFastify.route).toHaveBeenCalledWith(expect.objectContaining({ url: "/items/" }));
  });
});
