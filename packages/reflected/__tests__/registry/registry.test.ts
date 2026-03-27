import { registry } from "../../src/registry.js";

beforeEach(() => {
  registry.clear();
});

describe("ControllerRegistry", () => {
  it("registers and retrieves controllers", () => {
    class ControllerA {}
    class ControllerB {}

    registry.register(ControllerA);
    registry.register(ControllerB);

    const all = registry.getAll();
    expect(all).toContain(ControllerA);
    expect(all).toContain(ControllerB);
  });

  it("deduplicates duplicate registrations", () => {
    class MyController {}

    registry.register(MyController);
    registry.register(MyController);

    expect(registry.getAll()).toHaveLength(1);
  });

  it("clears all registrations", () => {
    class MyController {}
    registry.register(MyController);
    registry.clear();
    expect(registry.getAll()).toHaveLength(0);
  });
});
