import type { OnApplicationBootstrap, OnApplicationShutdown } from "../../src/lifecycle.js";

describe("Lifecycle interfaces", () => {
  it("OnApplicationBootstrap is implemented correctly", async () => {
    class MyService implements OnApplicationBootstrap {
      bootstrapped = false;

      async onApplicationBootstrap() {
        this.bootstrapped = true;
      }
    }

    const svc = new MyService();
    await svc.onApplicationBootstrap();
    expect(svc.bootstrapped).toBe(true);
  });

  it("OnApplicationShutdown receives signal", async () => {
    let receivedSignal: string | undefined;

    class MyService implements OnApplicationShutdown {
      onApplicationShutdown(signal?: string) {
        receivedSignal = signal;
      }
    }

    const svc = new MyService();
    svc.onApplicationShutdown("SIGTERM");
    expect(receivedSignal).toBe("SIGTERM");
  });

  it("both interfaces can be implemented together", async () => {
    const calls: string[] = [];

    class FullLifecycle implements OnApplicationBootstrap, OnApplicationShutdown {
      async onApplicationBootstrap() {
        calls.push("bootstrap");
      }

      onApplicationShutdown(signal?: string) {
        calls.push(`shutdown:${signal ?? "none"}`);
      }
    }

    const svc = new FullLifecycle();
    await svc.onApplicationBootstrap();
    svc.onApplicationShutdown("SIGINT");

    expect(calls).toEqual(["bootstrap", "shutdown:SIGINT"]);
  });
});
