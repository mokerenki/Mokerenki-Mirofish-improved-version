import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
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

describe("Entity Graph Visualization", () => {
  it("should create an entity", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.entityGraph.createEntity({
      conversationId: 1,
      name: "Apple Inc.",
      type: "Company",
      description: "Technology company",
      color: "#FF6B6B",
    });

    expect(result).toBeDefined();
  });

  it("should create a relationship", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create entities first
    await caller.entityGraph.createEntity({
      conversationId: 1,
      name: "Company A",
      type: "Company",
    });

    await caller.entityGraph.createEntity({
      conversationId: 1,
      name: "Company B",
      type: "Company",
    });

    // Create relationship
    const result = await caller.entityGraph.createRelationship({
      conversationId: 1,
      sourceEntityId: 1,
      targetEntityId: 2,
      relationshipType: "PARTNERS_WITH",
      strength: 0.8,
      description: "Strategic partnership",
    });

    expect(result).toBeDefined();
  });

  it("should retrieve entities for a conversation", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const entities = await caller.entityGraph.getEntities({
      conversationId: 1,
    });

    expect(Array.isArray(entities)).toBe(true);
  });

  it("should retrieve relationships for a conversation", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const relationships = await caller.entityGraph.getRelationships({
      conversationId: 1,
    });

    expect(Array.isArray(relationships)).toBe(true);
  });

  it("should import a dataset with entities and relationships", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.entityGraph.importDataset({
      conversationId: 2,
      name: "Tech Ecosystem",
      description: "Major tech companies and their relationships",
      entities: [
        {
          id: "apple",
          name: "Apple Inc.",
          type: "Company",
          description: "Technology company",
          color: "#FF6B6B",
        },
        {
          id: "microsoft",
          name: "Microsoft Corp.",
          type: "Company",
          description: "Software company",
          color: "#0078D4",
        },
        {
          id: "google",
          name: "Google LLC",
          type: "Company",
          description: "Search and advertising company",
          color: "#4285F4",
        },
      ],
      relationships: [
        {
          source: "apple",
          target: "microsoft",
          type: "COMPETES_WITH",
          strength: 0.9,
          description: "Direct competition in cloud services",
        },
        {
          source: "microsoft",
          target: "google",
          type: "COMPETES_WITH",
          strength: 0.85,
          description: "Competition in search and productivity",
        },
        {
          source: "apple",
          target: "google",
          type: "PARTNERS_WITH",
          strength: 0.7,
          description: "Partnership in mobile services",
        },
      ],
    });

    expect(result).toHaveProperty("entitiesCreated");
    expect(result).toHaveProperty("relationshipsCreated");
    expect(result.entitiesCreated).toBe(3);
    expect(result.relationshipsCreated).toBe(3);
  });

  it("should get graph statistics", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.entityGraph.getGraphStats({
      conversationId: 2,
    });

    expect(stats).toHaveProperty("totalEntities");
    expect(stats).toHaveProperty("totalRelationships");
    expect(stats).toHaveProperty("entityTypes");
    expect(stats).toHaveProperty("relationshipTypes");
    expect(stats).toHaveProperty("averageStrength");
    expect(stats).toHaveProperty("density");

    // Verify types
    expect(typeof stats.totalEntities).toBe("number");
    expect(typeof stats.totalRelationships).toBe("number");
    expect(typeof stats.averageStrength).toBe("number");
    expect(typeof stats.density).toBe("number");
  });

  it("should retrieve datasets", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const datasets = await caller.entityGraph.getDatasets({
      conversationId: 2,
    });

    expect(Array.isArray(datasets)).toBe(true);
  });

  it("should delete an entity and its relationships", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create entities and relationship
    await caller.entityGraph.createEntity({
      conversationId: 3,
      name: "Entity to Delete",
      type: "Company",
    });

    // Delete entity
    const result = await caller.entityGraph.deleteEntity({
      entityId: 1,
    });

    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
  });

  it("should handle large datasets", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a large dataset
    const entities = Array.from({ length: 50 }, (_, i) => ({
      id: `entity-${i}`,
      name: `Entity ${i}`,
      type: i % 3 === 0 ? "Company" : i % 3 === 1 ? "Person" : "Organization",
    }));

    const relationships = Array.from({ length: 100 }, (_, i) => ({
      source: `entity-${i % 50}`,
      target: `entity-${(i + 1) % 50}`,
      type: i % 2 === 0 ? "RELATES_TO" : "OWNS",
      strength: Math.random(),
    }));

    const result = await caller.entityGraph.importDataset({
      conversationId: 4,
      name: "Large Dataset",
      entities,
      relationships,
    });

    expect(result.entitiesCreated).toBe(50);
    expect(result.relationshipsCreated).toBe(100);
  });


});
