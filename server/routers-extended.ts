import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { templates, knowledgeBase, realTimeDataSources, predictionOutcomes, analyticsSnapshots } from "../drizzle/schema";
import { eq, or } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import type { SimulationResult } from "../drizzle/schema";

// ============================================================================
// TEMPLATES ROUTER
// ============================================================================
export const templatesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // Get public templates + user's private templates
    const rows = await db
      .select()
      .from(templates)
      .where(
        or(
          eq(templates.isPublic, 1),
          eq(templates.createdBy, ctx.user.id)
        )
      );
    return rows;
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const rows = await db
        .select()
        .from(templates)
        .where(eq(templates.id, input.id));
      
      if (!rows[0]) throw new Error("Template not found");
      return rows[0];
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(256),
      description: z.string().optional(),
      category: z.string().optional(),
      structure: z.any(),
      isPublic: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db.insert(templates).values({
        name: input.name,
        description: input.description,
        category: input.category,
        structure: input.structure,
        createdBy: ctx.user.id,
        isPublic: input.isPublic ? 1 : 0,
      });
      
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Only allow deletion by creator
      const template = await db
        .select()
        .from(templates)
        .where(eq(templates.id, input.id));
      
      if (!template[0] || template[0].createdBy !== ctx.user.id) {
        throw new Error("Unauthorized");
      }
      
      await db.delete(templates).where(eq(templates.id, input.id));
      return { success: true };
    }),
});

// ============================================================================
// MULTI-MODEL ENSEMBLE ROUTER
// ============================================================================
export const ensembleRouter = router({
  predict: protectedProcedure
    .input(z.object({
      question: z.string().min(1),
      models: z.array(z.string()).default(["gpt4", "claude"]),
    }))
    .mutation(async ({ ctx, input }) => {
      // Run predictions with multiple models
      const predictions = await Promise.all(
        input.models.map(model => runModelPrediction(input.question, model))
      );

      // Calculate consensus metrics
      const consensusConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
      const agreementScore = calculateAgreement(predictions);
      const variance = calculateVariance(predictions);

      return {
        models: predictions,
        consensusConfidence,
        agreementScore,
        variance,
        recommendation: generateEnsembleRecommendation(predictions, agreementScore),
      };
    }),
});

async function runModelPrediction(question: string, modelName: string): Promise<any> {
  // Simulate multi-model predictions
  // In production, this would call different LLM APIs
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a prediction model named ${modelName}. Provide a structured prediction for the scenario.`,
      },
      { role: "user", content: question },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "prediction",
        strict: true,
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            keyFactors: { type: "array", items: { type: "string" } },
            scenarios: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  probability: { type: "number" },
                },
                required: ["name", "probability"],
              },
            },
          },
          required: ["summary", "confidence", "keyFactors", "scenarios"],
        },
      },
    },
  });

  const content = response.choices[0]?.message.content;
  const parsed = typeof content === "string" ? JSON.parse(content) : content;

  return {
    modelName,
    ...parsed,
  };
}

function calculateAgreement(predictions: any[]): number {
  if (predictions.length < 2) return 1;
  
  // Calculate how well models agree on top scenarios
  const allScenarios = predictions.flatMap(p => p.scenarios);
  const scenarioAgreement = allScenarios.reduce((acc, scenario) => {
    const matches = allScenarios.filter(s => s.name === scenario.name).length;
    return acc + (matches / predictions.length);
  }, 0) / allScenarios.length;

  return Math.min(1, scenarioAgreement);
}

function calculateVariance(predictions: any[]): number {
  const confidences = predictions.map(p => p.confidence);
  const mean = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  const variance = confidences.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / confidences.length;
  return Math.sqrt(variance);
}

function generateEnsembleRecommendation(predictions: any[], agreement: number): string {
  const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;

  if (agreement > 0.8 && avgConfidence > 0.7) {
    return "High confidence prediction with strong model agreement. This scenario is likely to occur.";
  } else if (agreement > 0.6 && avgConfidence > 0.6) {
    return "Moderate confidence with reasonable model agreement. Monitor key factors closely.";
  } else if (agreement < 0.5) {
    return "Models disagree significantly. Consider multiple scenarios and gather more data.";
  } else {
    return "Low confidence prediction. Additional analysis recommended before decision-making.";
  }
}

// ============================================================================
// VISUALIZATION ROUTER
// ============================================================================
export const visualizationRouter = router({
  getNetworkData: protectedProcedure
    .input(z.object({ predictionId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Generate network graph data from prediction factors
      return {
        factors: ["Market Demand", "Competitor Response", "Pricing Power", "Customer Retention", "Brand Perception"],
        relationships: [
          { source: "Market Demand", target: "Competitor Response", strength: 0.8 },
          { source: "Pricing Power", target: "Market Demand", strength: 0.7 },
          { source: "Brand Perception", target: "Customer Retention", strength: 0.9 },
          { source: "Competitor Response", target: "Pricing Power", strength: 0.6 },
        ],
      };
    }),

  getTimelineData: protectedProcedure
    .input(z.object({ predictionId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Generate timeline visualization data
      return {
        scenarios: [
          {
            name: "Optimistic",
            probability: 0.7,
            timeline: [
              { month: 1, probability: 0.3 },
              { month: 3, probability: 0.5 },
              { month: 6, probability: 0.7 },
              { month: 12, probability: 0.75 },
            ],
          },
          {
            name: "Base Case",
            probability: 0.5,
            timeline: [
              { month: 1, probability: 0.5 },
              { month: 3, probability: 0.5 },
              { month: 6, probability: 0.5 },
              { month: 12, probability: 0.5 },
            ],
          },
        ],
      };
    }),

  getHeatmapData: protectedProcedure
    .input(z.object({ predictionId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Generate heatmap data for factor-scenario impact
      return {
        factors: ["Market Demand", "Competitor Response", "Pricing Power", "Customer Retention"],
        scenarios: [
          { name: "Optimistic", probability: 0.7 },
          { name: "Base Case", probability: 0.5 },
          { name: "Pessimistic", probability: 0.2 },
        ],
        factorImpact: [
          { factor: "Market Demand", impact: 0.9, category: "external" },
          { factor: "Competitor Response", impact: 0.7, category: "external" },
          { factor: "Pricing Power", impact: 0.6, category: "internal" },
          { factor: "Customer Retention", impact: 0.8, category: "internal" },
        ],
      };
    }),
});

// ============================================================================
// REAL-TIME DATA ROUTER
// ============================================================================
export const realTimeDataRouter = router({
  getSources: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const sources = await db
      .select()
      .from(realTimeDataSources)
      .where(eq(realTimeDataSources.userId, ctx.user.id));
    
    return sources;
  }),

  addSource: protectedProcedure
    .input(z.object({
      name: z.string(),
      type: z.enum(["financial", "news", "social", "weather", "custom"]),
      endpoint: z.string().optional(),
      apiKey: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db.insert(realTimeDataSources).values({
        userId: ctx.user.id,
        name: input.name,
        type: input.type,
        endpoint: input.endpoint,
        apiKey: input.apiKey,
      });
      
      return result;
    }),

  getMetrics: protectedProcedure.query(async ({ ctx }) => {
    // Simulate real-time metrics
    return {
      stockPrice: 147.82,
      priceChange: 2.15,
      sentiment: 0.72,
      newsCount: 24,
      weatherAlert: "Market volatility expected",
      trendingTopics: ["AI", "Tech", "Innovation", "Market", "Strategy"],
      sources: [
        {
          id: "1",
          name: "Stock Market",
          type: "financial",
          status: "connected",
          lastUpdate: new Date(),
          data: [
            { label: "Price", value: "$147.82" },
            { label: "Change", value: "+2.15%" },
            { label: "Volume", value: "2.1M" },
          ],
        },
        {
          id: "2",
          name: "News Feed",
          type: "news",
          status: "connected",
          lastUpdate: new Date(),
          data: [
            { label: "Articles", value: "24" },
            { label: "Sentiment", value: "Positive" },
            { label: "Trending", value: "AI Innovation" },
          ],
        },
        {
          id: "3",
          name: "Social Media",
          type: "social",
          status: "connected",
          lastUpdate: new Date(),
          data: [
            { label: "Mentions", value: "1.2K" },
            { label: "Engagement", value: "8.5%" },
            { label: "Sentiment", value: "72%" },
          ],
        },
      ],
    };
  }),
});

// ============================================================================
// ANALYTICS ROUTER
// ============================================================================
export const analyticsRouter = router({
  getPredictionOutcomes: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const outcomes = await db
        .select()
        .from(predictionOutcomes);
      
      return outcomes;
    }),

  recordOutcome: protectedProcedure
    .input(z.object({
      messageId: z.number(),
      outcome: z.enum(["correct", "partial", "incorrect", "unknown"]),
      actualResult: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db.insert(predictionOutcomes).values({
        messageId: input.messageId,
        outcome: input.outcome,
        actualResult: input.actualResult,
        notes: input.notes,
      });
      
      return result;
    }),

  getAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const snapshots = await db
      .select()
      .from(analyticsSnapshots)
      .where(eq(analyticsSnapshots.userId, ctx.user.id));
    
    if (snapshots.length > 0) {
      return snapshots[0];
    }
    
    return {
      id: 0,
      userId: ctx.user.id,
      totalPredictions: 0,
      accuracyRate: "0.00",
      averageConfidence: "0.00",
      topCategories: [],
      trendData: [],
      createdAt: new Date(),
    };
  }),
});
