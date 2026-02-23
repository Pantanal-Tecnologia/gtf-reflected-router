import "reflect-metadata";
import {
  Controller,
  Delete,
  Get,
  getControllerPrefix,
  getRequestParams,
  getResponseParams,
  getRoutes,
  Head,
  HTTP_METHODS,
  Options,
  Patch,
  Post,
  Put,
  Request,
  Response,
  Route,
} from "../../src/decorators";

// ---------------------------------------------------------------------------
// HTTP_METHODS
// ---------------------------------------------------------------------------

describe("HTTP_METHODS", () => {
  it("deve conter os 7 métodos padrão", () => {
    expect(Object.keys(HTTP_METHODS)).toHaveLength(7);
    expect(HTTP_METHODS.GET).toBe("GET");
    expect(HTTP_METHODS.DELETE).toBe("DELETE");
  });
});

// ---------------------------------------------------------------------------
// @Route
// ---------------------------------------------------------------------------

describe("@Route", () => {
  it("registra uma rota com sucesso", () => {
    class TestController {
      @Get("/items")
      list() {}
    }
    const routes = getRoutes(TestController);
    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({ method: "GET", path: "/items", handler: "list" });
  });

  it("lança erro para método HTTP inválido", () => {
    expect(() => {
      class Bad {
        @Route("INVALID", "/test")
        handler() {}
      }
      return Bad;
    }).toThrow("não é suportado");
  });

  it('lança erro para path sem "/"', () => {
    expect(() => {
      class Bad {
        @Get("sem-barra")
        handler() {}
      }
      return Bad;
    }).toThrow('deve começar com "/"');
  });

  it("lança erro para rotas duplicadas", () => {
    expect(() => {
      class Bad {
        @Get("/dup")
        a() {}
        @Get("/dup")
        b() {}
      }
      return Bad;
    }).toThrow("já está registrada");
  });

  it("registra múltiplas rotas em um controller", () => {
    class Multi {
      @Get("/a")
      a() {}
      @Post("/b")
      b() {}
      @Put("/c")
      c() {}
      @Delete("/d")
      d() {}
      @Patch("/e")
      e() {}
      @Head("/f")
      f() {}
      @Options("/g")
      g() {}
    }
    expect(getRoutes(Multi)).toHaveLength(7);
  });

  it("registra options de rota (schema)", () => {
    class WithSchema {
      @Get("/x", { schema: { tags: ["test"] } })
      x() {}
    }
    const [route] = getRoutes(WithSchema);
    expect(route?.options?.schema).toEqual({ tags: ["test"] });
  });
});

// ---------------------------------------------------------------------------
// @Controller
// ---------------------------------------------------------------------------

describe("@Controller", () => {
  it("registra o prefixo do controller", () => {
    @Controller("/users")
    class UsersCtrl {}
    expect(getControllerPrefix(UsersCtrl)).toBe("/users");
  });

  it("retorna string vazia sem @Controller", () => {
    class NoPrefixCtrl {}
    expect(getControllerPrefix(NoPrefixCtrl)).toBe("");
  });

  it("aceita prefixo vazio", () => {
    @Controller()
    class RootCtrl {}
    expect(getControllerPrefix(RootCtrl)).toBe("");
  });

  it('lança erro para prefixo sem "/"', () => {
    expect(() => {
      @Controller("sem-barra")
      class Bad {}
      return Bad;
    }).toThrow('deve começar com "/"');
  });
});

// ---------------------------------------------------------------------------
// @Request / @Response
// ---------------------------------------------------------------------------

describe("@Request e @Response", () => {
  it("registra índice do parâmetro @Request", () => {
    class Ctrl {
      @Get("/r")
      handler(@Request() _req: unknown) {}
    }
    expect(getRequestParams(Ctrl.prototype, "handler")).toContain(0);
  });

  it("registra índice do parâmetro @Response", () => {
    class Ctrl {
      @Get("/r")
      handler(@Response() _rep: unknown) {}
    }
    expect(getResponseParams(Ctrl.prototype, "handler")).toContain(0);
  });

  it("registra múltiplos parâmetros decorados", () => {
    class Ctrl {
      @Post("/multi")
      handler(@Request() _req: unknown, @Response() _rep: unknown) {}
    }
    expect(getRequestParams(Ctrl.prototype, "handler")).toContain(0);
    expect(getResponseParams(Ctrl.prototype, "handler")).toContain(1);
  });
});
