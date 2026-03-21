import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { entities, relationships, entityGraphDatasets } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { storagePut } from "./storage";

export const entityGraphRouter = router({
  // Get all entities for a conversation
  getEntities: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(entities)
        .where(
          and(
            eq(entities.conversationId, input.conversationId),
            eq(entities.userId, ctx.user.id)
          )
        );

      return result;
    }),

  // Get all relationships for a conversation
  getRelationships: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(relationships)
        .where(
          and(
            eq(relationships.conversationId, input.conversationId),
            eq(relationships.userId, ctx.user.id)
          )
        );

      return result;
    }),

  // Create entity
  createEntity: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        name: z.string().min(1),
        type: z.string(),
        description: z.string().optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(entities).values({
        conversationId: input.conversationId,
        userId: ctx.user.id,
        name: input.name,
        type: input.type,
        description: input.description,
        color: input.color,
      });

      return result;
    }),

  // Create relationship
  createRelationship: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        sourceEntityId: z.number(),
        targetEntityId: z.number(),
        relationshipType: z.string(),
        strength: z.number().min(0).max(1).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(relationships).values({
        conversationId: input.conversationId,
        userId: ctx.user.id,
        sourceEntityId: input.sourceEntityId,
        targetEntityId: input.targetEntityId,
        relationshipType: input.relationshipType,
        strength: input.strength?.toString() || "0.5",
        description: input.description,
      });

      return result;
    }),

  // Bulk import entities and relationships
  importDataset: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        name: z.string(),
        description: z.string().optional(),
        entities: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            type: z.string(),
            description: z.string().optional(),
            color: z.string().optional(),
          })
        ),
        relationships: z.array(
          z.object({
            source: z.string(),
            target: z.string(),
            type: z.string(),
            strength: z.number().optional(),
            description: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create dataset record
      const datasetResult = await db.insert(entityGraphDatasets).values({
        conversationId: input.conversationId,
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
        entityCount: input.entities.length,
        relationshipCount: input.relationships.length,
      });

      // Map external IDs to database IDs
      const idMap: Record<string, number> = {};

      // Insert entities
      for (const entity of input.entities) {
        const result = await db.insert(entities).values({
          conversationId: input.conversationId,
          userId: ctx.user.id,
          name: entity.name,
          type: entity.type,
          description: entity.description,
          color: entity.color,
        });

        // Store the mapping
        idMap[entity.id] = result[0]?.insertId || 0;
      }

      // Insert relationships using mapped IDs
      for (const rel of input.relationships) {
        const sourceId = idMap[rel.source];
        const targetId = idMap[rel.target];

        if (sourceId && targetId) {
          await db.insert(relationships).values({
            conversationId: input.conversationId,
            userId: ctx.user.id,
            sourceEntityId: sourceId,
            targetEntityId: targetId,
            relationshipType: rel.type,
            strength: rel.strength?.toString() || "0.5",
            description: rel.description,
          });
        }
      }

      return {
        datasetId: datasetResult[0]?.insertId,
        entitiesCreated: input.entities.length,
        relationshipsCreated: input.relationships.length,
      };
    }),

  // Delete entity
  deleteEntity: protectedProcedure
    .input(z.object({ entityId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Delete entity and its relationships
      await db
        .delete(relationships)
        .where(
          and(
            eq(relationships.userId, ctx.user.id),
            eq(relationships.sourceEntityId, input.entityId)
          )
        );
      
      await db
        .delete(relationships)
        .where(
          and(
            eq(relationships.userId, ctx.user.id),
            eq(relationships.targetEntityId, input.entityId)
          )
        );

      await db
        .delete(entities)
        .where(
          and(
            eq(entities.id, input.entityId),
            eq(entities.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  // Get datasets
  getDatasets: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(entityGraphDatasets)
        .where(
          and(
            eq(entityGraphDatasets.conversationId, input.conversationId),
            eq(entityGraphDatasets.userId, ctx.user.id)
          )
        );

      return result;
    }),

  // Get graph statistics
  getGraphStats: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const entityList = await db
        .select()
        .from(entities)
        .where(
          and(
            eq(entities.conversationId, input.conversationId),
            eq(entities.userId, ctx.user.id)
          )
        );

      const relationshipList = await db
        .select()
        .from(relationships)
        .where(
          and(
            eq(relationships.conversationId, input.conversationId),
            eq(relationships.userId, ctx.user.id)
          )
        );

      // Calculate statistics
      const entityTypes = new Map<string, number>();
      const relationshipTypes = new Map<string, number>();
      let totalStrength = 0;

      entityList.forEach((e) => {
        entityTypes.set(e.type, (entityTypes.get(e.type) || 0) + 1);
      });

      relationshipList.forEach((r) => {
        relationshipTypes.set(
          r.relationshipType,
          (relationshipTypes.get(r.relationshipType) || 0) + 1
        );
        totalStrength += parseFloat(r.strength?.toString() || "0.5");
      });

      return {
        totalEntities: entityList.length,
        totalRelationships: relationshipList.length,
        entityTypes: Object.fromEntries(entityTypes),
        relationshipTypes: Object.fromEntries(relationshipTypes),
        averageStrength:
          relationshipList.length > 0
            ? totalStrength / relationshipList.length
            : 0,
        density:
          entityList.length > 1
            ? (relationshipList.length /
                (entityList.length * (entityList.length - 1))) *
              100
            : 0,
      };
    }),
});
