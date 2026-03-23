import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("location", () => {
  it("should save user location successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.location.saveLocation({
      latitude: 40.7128,
      longitude: -74.006,
      city: "New York",
      region: "NY",
      country: "USA",
      timezone: "America/New_York",
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.location).toBeDefined();
  });

  it("should get location context", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.location.getLocationContext({});

    expect(result).toBeDefined();
    expect(typeof result.hasLocation).toBe("boolean");
    expect(typeof result.context).toBe("string");
  });

  it("should get user location", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.location.getUserLocation();

    expect(result).toBeDefined();
    expect(typeof result.context).toBe("string");
  });

  it("should disable location tracking", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.location.disableLocationTracking();

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
});
