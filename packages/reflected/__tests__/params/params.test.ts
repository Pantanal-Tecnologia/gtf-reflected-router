import "reflect-metadata";
import {
  Body,
  Query,
  Param,
  Headers,
  Req,
  Res,
  createParamDecorator,
  getParamMetadata,
  getCustomParamMetadata,
} from "../../src/params.js";
import { ParamType } from "../../src/types.js";

describe("Param decorators", () => {
  describe("@Body()", () => {
    it("registers param metadata with BODY type", () => {
      class TestController {
        handler(@Body() body: any) {}
      }
      const params = getParamMetadata(TestController, "handler");
      expect(params).toHaveLength(1);
      expect(params[0]).toMatchObject({ index: 0, type: ParamType.BODY });
    });

    it("registers param metadata with key", () => {
      class TestController {
        handler(@Body("name") name: string) {}
      }
      const params = getParamMetadata(TestController, "handler");
      expect(params[0]).toMatchObject({ index: 0, type: ParamType.BODY, key: "name" });
    });
  });

  describe("@Query()", () => {
    it("registers param metadata with QUERY type", () => {
      class TestController {
        handler(@Query() query: any) {}
      }
      const params = getParamMetadata(TestController, "handler");
      expect(params[0]).toMatchObject({ index: 0, type: ParamType.QUERY });
    });

    it("registers param metadata with key", () => {
      class TestController {
        handler(@Query("page") page: string) {}
      }
      const params = getParamMetadata(TestController, "handler");
      expect(params[0]).toMatchObject({ index: 0, type: ParamType.QUERY, key: "page" });
    });
  });

  describe("@Param()", () => {
    it("registers param metadata with PARAM type", () => {
      class TestController {
        handler(@Param("id") id: string) {}
      }
      const params = getParamMetadata(TestController, "handler");
      expect(params[0]).toMatchObject({ index: 0, type: ParamType.PARAM, key: "id" });
    });
  });

  describe("@Headers()", () => {
    it("registers param metadata with HEADERS type", () => {
      class TestController {
        handler(@Headers() headers: any) {}
      }
      const params = getParamMetadata(TestController, "handler");
      expect(params[0]).toMatchObject({ index: 0, type: ParamType.HEADERS });
    });
  });

  describe("@Req()", () => {
    it("registers param metadata with REQUEST type", () => {
      class TestController {
        handler(@Req() req: any) {}
      }
      const params = getParamMetadata(TestController, "handler");
      expect(params[0]).toMatchObject({ index: 0, type: ParamType.REQUEST });
    });
  });

  describe("@Res()", () => {
    it("registers param metadata with REPLY type", () => {
      class TestController {
        handler(@Res() res: any) {}
      }
      const params = getParamMetadata(TestController, "handler");
      expect(params[0]).toMatchObject({ index: 0, type: ParamType.REPLY });
    });
  });

  describe("multiple params", () => {
    it("registers multiple params in correct order", () => {
      class TestController {
        handler(@Param("id") id: string, @Body() body: any, @Req() req: any) {}
      }
      const params = getParamMetadata(TestController, "handler");
      expect(params).toHaveLength(3);
      const sorted = [...params].sort((a, b) => a.index - b.index);
      expect(sorted[0]).toMatchObject({ index: 0, type: ParamType.PARAM, key: "id" });
      expect(sorted[1]).toMatchObject({ index: 1, type: ParamType.BODY });
      expect(sorted[2]).toMatchObject({ index: 2, type: ParamType.REQUEST });
    });
  });

  describe("createParamDecorator", () => {
    it("creates a custom param decorator and registers factory", () => {
      const User = createParamDecorator((data, ctx) => {
        return { id: 1 };
      });

      class TestController {
        handler(@User() user: any) {}
      }

      const customParams = getCustomParamMetadata(TestController, "handler");
      expect(customParams).toHaveLength(1);
      expect(customParams[0].index).toBe(0);
      expect(typeof customParams[0].factory).toBe("function");
    });

    it("passes data to the factory", () => {
      const CurrentUser = createParamDecorator<string>((data, ctx) => data);

      class TestController {
        handler(@CurrentUser("admin") user: any) {}
      }

      const customParams = getCustomParamMetadata(TestController, "handler");
      expect(customParams[0].data).toBe("admin");
    });

    it("does not register to the same key in different controllers", () => {
      class ControllerA {
        handler(@Body() body: any) {}
      }
      class ControllerB {
        handler(@Query() query: any) {}
      }

      const paramsA = getParamMetadata(ControllerA, "handler");
      const paramsB = getParamMetadata(ControllerB, "handler");
      expect(paramsA[0].type).toBe(ParamType.BODY);
      expect(paramsB[0].type).toBe(ParamType.QUERY);
    });
  });
});
