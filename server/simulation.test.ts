import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  createConversation: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    title: "Test conversation",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getConversationsByUserId: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      title: "Test conversation",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getConversationById: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    title: "Test conversation",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  deleteConversation: vi.fn().mockResolvedValue(undefined),
  createMessage: vi.fn().mockResolvedValue({
    id: 10,
    conversationId: 1,
    role: "user",
    content: "Test question",
    attachments: [],
    simulationResult: null,
    createdAt: new Date(),
  }),
  getMessagesByConversationId: vi.fn().mockResolvedValue([]),
  updateMessageSimulationResult: vi.fn().mockResolvedValue(undefined),
  getDb: vi.fn().mockResolvedValue(null),
}));

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("conversations router", () => {
  it("creates a conversation with a valid title", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.create({ title: "Test scenario question" });
    expect(result).toBeDefined();
    expect(result.id).toBe(1);
    expect(result.title).toBe("Test conversation");
  });

  it("lists conversations for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("deletes a conversation", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.delete({ id: 1 });
    expect(result.success).toBe(true);
  });
});

describe("auth router", () => {
  it("returns the authenticated user from me query", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.id).toBe(1);
    expect(result?.email).toBe("test@example.com");
  });

  it("returns null for unauthenticated me query", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("clears session cookie on logout", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});

describe("messages router", () => {
  it("throws when conversation not found", async () => {
    const { getConversationById } = await import("./db");
    vi.mocked(getConversationById).mockResolvedValueOnce(undefined);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.messages.list({ conversationId: 999 })
    ).rejects.toThrow("Conversation not found");
  });

  it("returns messages for a valid conversation", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.messages.list({ conversationId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});
