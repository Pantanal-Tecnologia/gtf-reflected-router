import "reflect-metadata";
import { PARAM_METADATA_KEY, CUSTOM_PARAM_METADATA_KEY } from "./metadata-keys";
import type { ParamMetadata, CustomParamMetadata, CustomParamFactory, ZodLike } from "./types";
import { ParamType } from "./types";

function isZodSchema(value: unknown): value is ZodLike {
  return (
    value !== null &&
    typeof value === "object" &&
    "safeParse" in (value as object) &&
    typeof (value as Record<string, unknown>)["safeParse"] === "function"
  );
}

function createBuiltinParamDecorator(type: ParamType) {
  return (keyOrSchema?: string | ZodLike): ParameterDecorator => {
    return (target, propertyKey, parameterIndex) => {
      if (propertyKey === undefined) return;
      const existing: ParamMetadata[] =
        Reflect.getOwnMetadata(PARAM_METADATA_KEY, (target as any).constructor, propertyKey) ?? [];

      const meta: ParamMetadata = { index: parameterIndex, type };
      if (typeof keyOrSchema === "string") {
        meta.key = keyOrSchema;
      } else if (isZodSchema(keyOrSchema)) {
        meta.schema = keyOrSchema;
      }

      existing.push(meta);
      Reflect.defineMetadata(
        PARAM_METADATA_KEY,
        existing,
        (target as any).constructor,
        propertyKey,
      );
    };
  };
}

export const Body = createBuiltinParamDecorator(ParamType.BODY);
export const Query = createBuiltinParamDecorator(ParamType.QUERY);
export const Param = createBuiltinParamDecorator(ParamType.PARAM);
export const Headers = createBuiltinParamDecorator(ParamType.HEADERS);
export const Req = createBuiltinParamDecorator(ParamType.REQUEST);
export const Res = createBuiltinParamDecorator(ParamType.REPLY);

export function createParamDecorator<TData = any, TResult = any>(
  factory: CustomParamFactory<TData, TResult>,
): (data?: TData) => ParameterDecorator {
  return (data?: TData): ParameterDecorator => {
    return (target, propertyKey, parameterIndex) => {
      if (propertyKey === undefined) return;
      const existing: CustomParamMetadata[] =
        Reflect.getOwnMetadata(
          CUSTOM_PARAM_METADATA_KEY,
          (target as any).constructor,
          propertyKey,
        ) ?? [];
      existing.push({ index: parameterIndex, factory, data });
      Reflect.defineMetadata(
        CUSTOM_PARAM_METADATA_KEY,
        existing,
        (target as any).constructor,
        propertyKey,
      );
    };
  };
}

export function getParamMetadata(target: object, propertyKey: string | symbol): ParamMetadata[] {
  return Reflect.getOwnMetadata(PARAM_METADATA_KEY, target, propertyKey) ?? [];
}

export function getCustomParamMetadata(
  target: object,
  propertyKey: string | symbol,
): CustomParamMetadata[] {
  return Reflect.getOwnMetadata(CUSTOM_PARAM_METADATA_KEY, target, propertyKey) ?? [];
}
