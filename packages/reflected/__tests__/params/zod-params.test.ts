import "reflect-metadata";
import { z } from "zod";
import { Body, Query, getParamMetadata } from "../../src/params.js";
import { ParamType } from "../../src/types.js";

describe("Param decorators with Zod schema", () => {
  it("@Body(schema) stores the schema in metadata", () => {
    const schema = z.object({ name: z.string() });

    class TestController {
      handler(@Body(schema) body: unknown) {}
    }

    const params = getParamMetadata(TestController, "handler");
    expect(params).toHaveLength(1);
    expect(params[0]).toMatchObject({ index: 0, type: ParamType.BODY });
    expect(params[0]?.schema).toBe(schema);
  });

  it("@Query(schema) stores the schema in metadata", () => {
    const schema = z.object({ page: z.coerce.number() });

    class TestController {
      handler(@Query(schema) query: unknown) {}
    }

    const params = getParamMetadata(TestController, "handler");
    expect(params[0]?.schema).toBe(schema);
  });

  it("schema validates successfully via safeParse", () => {
    const schema = z.object({ name: z.string().min(1) });

    class TestController {
      handler(@Body(schema) body: unknown) {}
    }

    const params = getParamMetadata(TestController, "handler");
    const result = params[0]?.schema?.safeParse({ name: "Alice" });
    expect(result?.success).toBe(true);
  });

  it("schema returns error for invalid data via safeParse", () => {
    const schema = z.object({ name: z.string().min(1) });

    class TestController {
      handler(@Body(schema) body: unknown) {}
    }

    const params = getParamMetadata(TestController, "handler");
    const result = params[0]?.schema?.safeParse({ name: "" });
    expect(result?.success).toBe(false);
  });

  it("@Body() without schema has no schema in metadata", () => {
    class TestController {
      handler(@Body() body: unknown) {}
    }

    const params = getParamMetadata(TestController, "handler");
    expect(params[0]?.schema).toBeUndefined();
  });

  it("@Body('field') with string key has no schema in metadata", () => {
    class TestController {
      handler(@Body("name") name: unknown) {}
    }

    const params = getParamMetadata(TestController, "handler");
    expect(params[0]?.key).toBe("name");
    expect(params[0]?.schema).toBeUndefined();
  });
});
