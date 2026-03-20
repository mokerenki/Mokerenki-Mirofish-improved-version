import type { Request, Response } from "express";
import { invokeLLM } from "./_core/llm";
import { updateMessageSimulationResult, getDb } from "./db";
import { storagePut } from "./storage";
import { messages as msgsTable } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import type { SimulationResult } from "../drizzle/schema";

export type SimulationStageEvent = {
  type: "stage";
  stage: "graph" | "prepare" | "simulate" | "report";
  status: "active" | "complete";
  progress: number;
};

export type SimulationCompleteEvent = {
  type: "complete";
  result: SimulationResult;
  messageId: number;
};

export type SimulationErrorEvent = {
  type: "error";
  message: string;
};

export type SimulationEvent = SimulationStageEvent | SimulationCompleteEvent | SimulationErrorEvent;

function sendEvent(res: Response, data: SimulationEvent) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export async function handleSimulationStream(req: Request, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  const { question, messageId, attachmentContext } = req.body as {
    question: string;
    messageId: number;
    attachmentContext?: string;
  };

  if (!question || !messageId) {
    sendEvent(res, { type: "error", message: "Missing question or messageId" });
    res.end();
    return;
  }

  try {
    // Stage 1: GRAPH
    sendEvent(res, { type: "stage", stage: "graph", status: "active", progress: 5 });
    await delay(600);
    sendEvent(res, { type: "stage", stage: "graph", status: "active", progress: 15 });
    await delay(500);
    sendEvent(res, { type: "stage", stage: "graph", status: "complete", progress: 25 });

    // Stage 2: PREPARE
    sendEvent(res, { type: "stage", stage: "prepare", status: "active", progress: 30 });
    await delay(500);
    sendEvent(res, { type: "stage", stage: "prepare", status: "active", progress: 40 });
    await delay(400);
    sendEvent(res, { type: "stage", stage: "prepare", status: "complete", progress: 50 });

    // Stage 3: SIMULATE — this is where the LLM runs
    sendEvent(res, { type: "stage", stage: "simulate", status: "active", progress: 55 });

    const context = attachmentContext ?? "";
    const systemPrompt = `You are MiroFish, an advanced AI scenario prediction engine. You run multi-agent simulations to predict outcomes of hypothetical scenarios. Your analysis is structured, data-driven, and insightful.`;

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

    sendEvent(res, { type: "stage", stage: "simulate", status: "active", progress: 65 });

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

    sendEvent(res, { type: "stage", stage: "simulate", status: "complete", progress: 75 });

    const raw = response.choices[0]?.message?.content;
    const content = typeof raw === "string" ? raw : null;
    if (!content) throw new Error("No response from LLM");

    const result = JSON.parse(content) as SimulationResult;

    // Stage 4: REPORT
    sendEvent(res, { type: "stage", stage: "report", status: "active", progress: 80 });
    await delay(400);
    sendEvent(res, { type: "stage", stage: "report", status: "active", progress: 90 });
    await delay(300);
    sendEvent(res, { type: "stage", stage: "report", status: "complete", progress: 100 });

    // Save to DB
    await updateMessageSimulationResult(messageId, result);

    // Send complete event
    sendEvent(res, { type: "complete", result, messageId });
    res.end();
  } catch (err: any) {
    console.error("[SimulationStream] Error:", err);
    sendEvent(res, { type: "error", message: err?.message ?? "Simulation failed" });
    res.end();
  }
}

export async function handleFileUpload(req: Request, res: Response) {
  try {
    const file = (req as any).file;
    if (!file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const allowedTypes = ["application/pdf", "text/markdown", "text/plain", "text/x-markdown"];
    const allowedExts = [".pdf", ".md", ".txt"];
    const ext = "." + file.originalname.split(".").pop()?.toLowerCase();

    if (!allowedExts.includes(ext)) {
      res.status(400).json({ error: "Only PDF, MD, and TXT files are allowed" });
      return;
    }

    const { nanoid } = await import("nanoid");
    const fileKey = `attachments/${nanoid()}-${file.originalname}`;
    const { url } = await storagePut(fileKey, file.buffer, file.mimetype);

    res.json({ url, name: file.originalname, type: file.mimetype });
  } catch (err: any) {
    console.error("[FileUpload] Error:", err);
    res.status(500).json({ error: err?.message ?? "Upload failed" });
  }
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
