import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  createConversation,
  getConversationsByUserId,
  getConversationById,
  deleteConversation,
  createMessage,
  getMessagesByConversationId,
  updateMessageSimulationResult,
} from "./db";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import type { SimulationResult } from "../drizzle/schema";
import { templatesRouter, ensembleRouter, visualizationRouter, realTimeDataRouter, analyticsRouter } from "./routers-extended";
import { entityGraphRouter } from "./entity-graph-router";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  conversations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getConversationsByUserId(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const conv = await getConversationById(input.id, ctx.user.id);
        if (!conv) throw new Error("Conversation not found");
        const msgs = await getMessagesByConversationId(input.id);
        return { ...conv, messages: msgs };
      }),

    create: protectedProcedure
      .input(z.object({ title: z.string().min(1).max(512) }))
      .mutation(async ({ ctx, input }) => {
        return createConversation({ userId: ctx.user.id, title: input.title });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteConversation(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  messages: router({
    list: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ ctx, input }) => {
        const conv = await getConversationById(input.conversationId, ctx.user.id);
        if (!conv) throw new Error("Conversation not found");
        return getMessagesByConversationId(input.conversationId);
      }),

    sendAndSimulate: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        content: z.string().min(1),
        attachments: z.array(z.object({
          name: z.string(),
          url: z.string(),
          type: z.string(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const conv = await getConversationById(input.conversationId, ctx.user.id);
        if (!conv) throw new Error("Conversation not found");

        // Save user message
        const userMsg = await createMessage({
          conversationId: input.conversationId,
          role: "user",
          content: input.content,
          attachments: input.attachments ?? [],
        });

        // Save placeholder assistant message
        const assistantMsg = await createMessage({
          conversationId: input.conversationId,
          role: "assistant",
          content: "Simulation in progress...",
        });

        // Run simulation in background (non-blocking)
        runSimulation(input.content, assistantMsg.id, input.attachments ?? []).catch(console.error);

        return { userMessageId: userMsg.id, assistantMessageId: assistantMsg.id };
      }),

    getSimulationResult: protectedProcedure
      .input(z.object({ messageId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await import("./db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");
        const { messages: msgsTable } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const rows = await db.select().from(msgsTable).where(eq(msgsTable.id, input.messageId)).limit(1);
        if (!rows[0]) throw new Error("Message not found");
        return rows[0];
      }),
  }),

  simulation: router({
    run: protectedProcedure
      .input(z.object({
        question: z.string().min(1),
        attachmentContext: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await runSimulationDirect(input.question, input.attachmentContext);
        return result;
      }),
  }),

  templates: templatesRouter,
  ensemble: ensembleRouter,
  visualization: visualizationRouter,
  realTimeData: realTimeDataRouter,
  analytics: analyticsRouter,
  entityGraph: entityGraphRouter,
});

async function runSimulation(
  question: string,
  assistantMessageId: number,
  attachments: Array<{ name: string; url: string; type: string }>
) {
  try {
    const attachmentContext = attachments.length > 0
      ? `\n\nAttached files: ${attachments.map(a => a.name).join(", ")}`
      : "";
    const result = await runSimulationDirect(question, attachmentContext);
    await updateMessageSimulationResult(assistantMessageId, result);
  } catch (err) {
    console.error("[Simulation] Failed:", err);
  }
}

async function runSimulationDirect(question: string, attachmentContext?: string): Promise<SimulationResult> {
  const context = attachmentContext ?? "";

  const systemPrompt = `You are MiroFish, an advanced AI scenario prediction engine. You run multi-agent simulations to predict outcomes of hypothetical scenarios. Your analysis is structured, data-driven, and insightful.

When given a scenario question, you:
1. Build a knowledge graph (GRAPH stage) - identify key entities, relationships, and causal chains
2. Prepare simulation parameters (PREPARE stage) - define variables, constraints, and initial conditions
3. Run the simulation (SIMULATE stage) - model different scenario branches and their probabilities
4. Generate a comprehensive report (REPORT stage) - synthesize findings into actionable insights

Always respond with structured JSON matching the exact schema provided.`;

  const userPrompt = `Analyze this scenario question and provide a comprehensive prediction:

Question: ${question}${context}

Return a JSON object with this exact structure:
{
  "question": "the original question",
  "summary": "2-3 sentence executive summary of the prediction",
  "confidence": 0.75,
  "timeframe": "e.g. 3-6 months",
  "keyFactors": ["factor1", "factor2", "factor3", "factor4", "factor5"],
  "scenarios": [
    {
      "name": "Most Likely Scenario",
      "probability": 0.55,
      "description": "Detailed description of what happens in this scenario",
      "impact": "high"
    },
    {
      "name": "Alternative Scenario",
      "probability": 0.30,
      "description": "Detailed description of this alternative outcome",
      "impact": "medium"
    },
    {
      "name": "Tail Risk Scenario",
      "probability": 0.15,
      "description": "Description of this less likely but important scenario",
      "impact": "high"
    }
  ],
  "reportSections": [
    {
      "title": "Graph Analysis",
      "content": "Detailed analysis of the knowledge graph built for this scenario, including key entities and relationships identified"
    },
    {
      "title": "Simulation Parameters",
      "content": "The variables, constraints, and initial conditions used in the simulation"
    },
    {
      "title": "Simulation Results",
      "content": "Detailed findings from running the multi-agent simulation across scenario branches"
    },
    {
      "title": "Key Insights",
      "content": "The most important insights and patterns discovered during the simulation"
    },
    {
      "title": "Risk Factors",
      "content": "Potential risks and uncertainties that could affect the predicted outcomes"
    }
  ],
  "followUpQuestions": [
    "Follow-up question 1 to explore further?",
    "Follow-up question 2 about a related aspect?",
    "Follow-up question 3 for deeper analysis?"
  ],
  "metadata": {
    "graphNodes": 42,
    "simulationRuns": 1000,
    "processingTime": 3200
  }
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "simulation_result",
        strict: true,
        schema: {
          type: "object",
          properties: {
            question: { type: "string" },
            summary: { type: "string" },
            confidence: { type: "number" },
            timeframe: { type: "string" },
            keyFactors: { type: "array", items: { type: "string" } },
            scenarios: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  probability: { type: "number" },
                  description: { type: "string" },
                  impact: { type: "string", enum: ["low", "medium", "high"] },
                },
                required: ["name", "probability", "description", "impact"],
                additionalProperties: false,
              },
            },
            reportSections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                },
                required: ["title", "content"],
                additionalProperties: false,
              },
            },
            followUpQuestions: { type: "array", items: { type: "string" } },
            metadata: {
              type: "object",
              properties: {
                graphNodes: { type: "number" },
                simulationRuns: { type: "number" },
                processingTime: { type: "number" },
              },
              required: ["graphNodes", "simulationRuns", "processingTime"],
              additionalProperties: false,
            },
          },
          required: ["question", "summary", "confidence", "timeframe", "keyFactors", "scenarios", "reportSections", "followUpQuestions", "metadata"],
          additionalProperties: false,
        },
      },
    },
  } as any);

  const raw = response.choices[0]?.message?.content;
  const content = typeof raw === "string" ? raw : null;
  if (!content) throw new Error("No response from LLM");
  return JSON.parse(content) as SimulationResult;
}

export type AppRouter = typeof appRouter;

export type { Entity, Relationship, EntityGraphDataset } from "../drizzle/schema";
