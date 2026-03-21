import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  decimal,
  index,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  isCollaborative: int("isCollaborative").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("userIdIdx").on(table.userId),
}));

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  attachments: json("attachments").$type<Array<{ name: string; url: string; type: string }>>(),
  simulationResult: json("simulationResult").$type<SimulationResult>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  conversationIdIdx: index("conversationIdIdx").on(table.conversationId),
}));

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

export type SimulationStage = "graph" | "prepare" | "simulate" | "report";

export type SimulationResult = {
  question: string;
  summary: string;
  confidence: number;
  timeframe: string;
  keyFactors: string[];
  scenarios: Array<{
    name: string;
    probability: number;
    description: string;
    impact: "low" | "medium" | "high";
  }>;
  reportSections: Array<{
    title: string;
    content: string;
  }>;
  followUpQuestions: string[];
  metadata: {
    graphNodes: number;
    simulationRuns: number;
    processingTime: number;
  };
};

// Prediction Outcomes - Track accuracy over time
export const predictionOutcomes = mysqlTable("prediction_outcomes", {
  id: int("id").autoincrement().primaryKey(),
  messageId: int("messageId").notNull(),
  outcome: mysqlEnum("outcome", ["correct", "partial", "incorrect", "unknown"]).default("unknown"),
  actualResult: text("actualResult"),
  notes: text("notes"),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
}, (table) => ({
  messageIdIdx: index("messageIdIdx").on(table.messageId),
}));

export type PredictionOutcome = typeof predictionOutcomes.$inferSelect;
export type InsertPredictionOutcome = typeof predictionOutcomes.$inferInsert;

// Knowledge Base - Store company documents for RAG
export const knowledgeBase = mysqlTable("knowledge_base", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  content: text("content").notNull(),
  fileUrl: varchar("fileUrl", { length: 2048 }),
  fileType: varchar("fileType", { length: 50 }),
  summary: text("summary"),
  tags: json("tags").$type<string[]>(),
  embedding: json("embedding").$type<number[]>(),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("kb_userIdIdx").on(table.userId),
}));

export type KnowledgeBaseEntry = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBaseEntry = typeof knowledgeBase.$inferInsert;

// Templates - Reusable prediction workflows
export const templates = mysqlTable("templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  structure: json("structure").$type<TemplateStructure>(),
  createdBy: int("createdBy"),
  isPublic: int("isPublic").default(0),
  version: int("version").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  createdByIdx: index("createdByIdx").on(table.createdBy),
}));

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;

export type TemplateStructure = {
  steps: Array<{
    id: string;
    title: string;
    description: string;
    type: "question" | "input" | "selection";
    content: string;
  }>;
  guidedPrompt: string;
};

// Workspace Members - Collaboration
export const workspaceMembers = mysqlTable("workspace_members", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "editor", "viewer"]).default("viewer"),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
}, (table) => ({
  conversationIdIdx: index("wm_conversationIdIdx").on(table.conversationId),
  userIdIdx: index("wm_userIdIdx").on(table.userId),
}));

export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type InsertWorkspaceMember = typeof workspaceMembers.$inferInsert;

// Prediction Comparisons - Track scenario comparisons
export const predictionComparisons = mysqlTable("prediction_comparisons", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  messageIds: json("messageIds").$type<number[]>(),
  comparisonType: varchar("comparisonType", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("pc_userIdIdx").on(table.userId),
}));

export type PredictionComparison = typeof predictionComparisons.$inferSelect;
export type InsertPredictionComparison = typeof predictionComparisons.$inferInsert;

// Real-Time Data Sources - Live data integration
export const realTimeDataSources = mysqlTable("real_time_data_sources", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  type: varchar("type", { length: 50 }),
  apiKey: varchar("apiKey", { length: 512 }),
  endpoint: varchar("endpoint", { length: 2048 }),
  refreshInterval: int("refreshInterval").default(3600),
  isActive: int("isActive").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("rtds_userIdIdx").on(table.userId),
}));

export type RealTimeDataSource = typeof realTimeDataSources.$inferSelect;
export type InsertRealTimeDataSource = typeof realTimeDataSources.$inferInsert;

// API Keys - For REST API access
export const apiKeys = mysqlTable("api_keys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  key: varchar("key", { length: 256 }).notNull().unique(),
  name: varchar("name", { length: 256 }),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("ak_userIdIdx").on(table.userId),
}));

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

// Webhooks - For external triggers
export const webhooks = mysqlTable("webhooks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  url: varchar("url", { length: 2048 }).notNull(),
  event: varchar("event", { length: 100 }),
  isActive: int("isActive").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("wh_userIdIdx").on(table.userId),
}));

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;

// Scheduled Jobs - For batch predictions
export const scheduledJobs = mysqlTable("scheduled_jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 256 }),
  questions: json("questions").$type<string[]>(),
  schedule: varchar("schedule", { length: 100 }),
  nextRunAt: timestamp("nextRunAt"),
  isActive: int("isActive").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("sj_userIdIdx").on(table.userId),
}));

export type ScheduledJob = typeof scheduledJobs.$inferSelect;
export type InsertScheduledJob = typeof scheduledJobs.$inferInsert;

// Analytics - Cross-prediction insights
export const analyticsSnapshots = mysqlTable("analytics_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  totalPredictions: int("totalPredictions").default(0),
  accuracyRate: decimal("accuracyRate", { precision: 5, scale: 2 }).default("0.00"),
  averageConfidence: decimal("averageConfidence", { precision: 5, scale: 2 }).default("0.00"),
  topCategories: json("topCategories").$type<Array<{ category: string; count: number }>>(),
  trendData: json("trendData").$type<Array<{ date: string; count: number }>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("as_userIdIdx").on(table.userId),
}));

export type AnalyticsSnapshot = typeof analyticsSnapshots.$inferSelect;
export type InsertAnalyticsSnapshot = typeof analyticsSnapshots.$inferInsert;

// Entity Relationship Graph - For network visualization
export const entities = mysqlTable("entities", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(), // e.g., Company, Person, Organization, MediaOutlet, etc.
  description: text("description"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  color: varchar("color", { length: 7 }), // Hex color for visualization
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  conversationIdIdx: index("ent_conversationIdIdx").on(table.conversationId),
  userIdIdx: index("ent_userIdIdx").on(table.userId),
}));

export type Entity = typeof entities.$inferSelect;
export type InsertEntity = typeof entities.$inferInsert;

// Relationships - Connections between entities
export const relationships = mysqlTable("relationships", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  userId: int("userId").notNull(),
  sourceEntityId: int("sourceEntityId").notNull(),
  targetEntityId: int("targetEntityId").notNull(),
  relationshipType: varchar("relationshipType", { length: 100 }).notNull(), // e.g., RELATES_TO, OWNS, MANAGES, etc.
  strength: decimal("strength", { precision: 3, scale: 2 }).default("0.5"), // 0-1 scale
  description: text("description"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  conversationIdIdx: index("rel_conversationIdIdx").on(table.conversationId),
  userIdIdx: index("rel_userIdIdx").on(table.userId),
  sourceIdx: index("rel_sourceIdx").on(table.sourceEntityId),
  targetIdx: index("rel_targetIdx").on(table.targetEntityId),
}));

export type Relationship = typeof relationships.$inferSelect;
export type InsertRelationship = typeof relationships.$inferInsert;

// Entity Graph Datasets - Uploaded datasets for visualization
export const entityGraphDatasets = mysqlTable("entity_graph_datasets", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  fileUrl: varchar("fileUrl", { length: 2048 }),
  fileFormat: varchar("fileFormat", { length: 50 }), // csv, json, etc.
  entityCount: int("entityCount").default(0),
  relationshipCount: int("relationshipCount").default(0),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  conversationIdIdx: index("egd_conversationIdIdx").on(table.conversationId),
  userIdIdx: index("egd_userIdIdx").on(table.userId),
}));

export type EntityGraphDataset = typeof entityGraphDatasets.$inferSelect;
export type InsertEntityGraphDataset = typeof entityGraphDatasets.$inferInsert;
