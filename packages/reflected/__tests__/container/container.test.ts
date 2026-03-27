import "reflect-metadata";
import { Container, Injectable } from "../../src/container.js";

beforeEach(() => {
  Container.clear();
});

describe("DIContainer", () => {
  describe("register / get", () => {
    it("creates a singleton by default", () => {
      @Injectable()
      class MyService {}

      const a = Container.get(MyService);
      const b = Container.get(MyService);
      expect(a).toBe(b);
    });

    it("creates new instance for transient scope", () => {
      @Injectable({ scope: "transient" })
      class TransientService {}

      const a = Container.get(TransientService);
      const b = Container.get(TransientService);
      expect(a).not.toBe(b);
    });

    it("resolves dependencies via design:paramtypes", () => {
      @Injectable()
      class DatabaseService {
        value = "db";
      }

      @Injectable()
      class UserService {
        constructor(public db: DatabaseService) {}
      }

      const svc = Container.get(UserService);
      expect(svc.db).toBeInstanceOf(DatabaseService);
      expect(svc.db.value).toBe("db");
    });

    it("resolves unregistered class without @Injectable (no deps)", () => {
      class PlainService {
        value = 42;
      }

      const svc = Container.get(PlainService);
      expect(svc.value).toBe(42);
    });
  });

  describe("circular dependency detection", () => {
    it("throws on circular dependency", () => {
      // We can't use decorators that self-reference easily,
      // so we manually register them.
      class ServiceA {
        constructor(public b: ServiceB) {}
      }
      class ServiceB {
        constructor(public a: ServiceA) {}
      }

      // Manually set design:paramtypes
      Reflect.defineMetadata("design:paramtypes", [ServiceB], ServiceA);
      Reflect.defineMetadata("design:paramtypes", [ServiceA], ServiceB);

      Container.register(ServiceA);
      Container.register(ServiceB);

      expect(() => Container.get(ServiceA)).toThrow("Dependência circular detectada");
    });
  });

  describe("has()", () => {
    it("returns true for registered class", () => {
      @Injectable()
      class Registered {}
      expect(Container.has(Registered)).toBe(true);
    });

    it("returns false for unregistered class", () => {
      class Unregistered {}
      expect(Container.has(Unregistered)).toBe(false);
    });
  });

  describe("@Injectable()", () => {
    it("registers metadata on the class", () => {
      const { INJECTABLE_METADATA_KEY } = require("../../src/metadata-keys.js");

      @Injectable({ scope: "transient" })
      class Tagged {}

      const meta = Reflect.getMetadata(INJECTABLE_METADATA_KEY, Tagged);
      expect(meta).toEqual({ scope: "transient" });
    });
  });
});
