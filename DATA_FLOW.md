# MiroFish Clone - Data Flow Architecture

## Overview

The MiroFish clone is a **full-stack AI-powered scenario prediction engine**. Data flows through multiple layers: frontend UI → backend API → LLM service → database → response back to user. Here's exactly where each piece of data comes from and how it moves through the system.

---

## 1. User Input Data (Frontend Origin)

### Landing Page (`/`)
- **Question input**: User types a scenario question in the dashed-border input box
- **Sample questions**: Hardcoded in `client/src/pages/Home.tsx` (3 pre-written examples)
- **File attachments**: User selects PDF/MD/TXT files from their local filesystem

### Chat Workspace (`/chat/:id`)
- **Question text**: User types in the textarea at the bottom
- **File attachments**: User clicks the paperclip icon and selects files
- **Follow-up questions**: Suggested by the AI in prediction cards (user clicks to send)

**Where it's stored**: 
- Questions and attachments are sent to the backend via tRPC mutation `messages.sendAndSimulate`
- Stored in MySQL `messages` table with columns: `id`, `conversationId`, `role`, `content`, `attachments` (JSON), `simulationResult` (JSON), `createdAt`

---

## 2. File Upload & Storage

### Upload Flow
```
User selects file → Browser FormData → POST /api/upload → Multer processes → S3 storage → URL returned
```

**Files are stored in:**
- **S3 (cloud storage)** via `storagePut()` helper in `server/storage.ts`
- File key format: `attachments/{nanoid}-{filename}`
- Returned URL is a public CDN link
- Metadata (name, URL, type) stored in `messages.attachments` JSON column

**Allowed file types:**
- `.pdf` (application/pdf)
- `.md` (text/markdown)
- `.txt` (text/plain)

**Validation:**
- File size limit: 16 MB (set in multer config)
- Extension whitelist enforced in `server/simulationStream.ts`

---

## 3. AI Simulation Engine (Data Generation)

### The Prediction Pipeline

When a user sends a question, the backend runs a **multi-stage LLM simulation**:

```
User Question
    ↓
[GRAPH Stage] - LLM builds knowledge graph
    ↓
[PREPARE Stage] - LLM defines simulation parameters
    ↓
[SIMULATE Stage] - LLM runs multi-agent simulation
    ↓
[REPORT Stage] - LLM synthesizes findings
    ↓
Structured JSON Response
```

### LLM Integration

**Where the AI data comes from:**
- **Service**: Manus built-in Forge API (preconfigured LLM service)
- **Function**: `invokeLLM()` in `server/_core/llm.ts`
- **Authentication**: Uses `BUILT_IN_FORGE_API_KEY` (injected by Manus platform)
- **Model**: Default model selected by the platform (typically GPT-4 or equivalent)

**How it works:**
1. User question is sent to `trpc.messages.sendAndSimulate` mutation
2. Backend creates a system prompt (defines MiroFish's role as prediction engine)
3. Backend creates a user prompt with the question + optional file context
4. `invokeLLM()` is called with:
   - Message array (system + user)
   - `response_format` set to `json_schema` (forces structured JSON output)
   - JSON schema defining the expected response structure

**The LLM generates:**
```json
{
  "question": "original question",
  "summary": "2-3 sentence prediction",
  "confidence": 0.75,
  "timeframe": "3-6 months",
  "keyFactors": ["factor1", "factor2", ...],
  "scenarios": [
    {
      "name": "Most Likely Scenario",
      "probability": 0.55,
      "description": "...",
      "impact": "high"
    },
    ...
  ],
  "reportSections": [
    {
      "title": "Graph Analysis",
      "content": "..."
    },
    ...
  ],
  "followUpQuestions": ["Q1?", "Q2?", "Q3?"],
  "metadata": {
    "graphNodes": 42,
    "simulationRuns": 1000,
    "processingTime": 3200
  }
}
```

---

## 4. Real-Time Streaming (SSE)

### Progress Visualization

While the LLM is processing, the frontend receives **real-time stage updates** via Server-Sent Events (SSE):

**Endpoint**: `POST /api/simulate/stream`

**Data flow:**
```
Frontend opens SSE connection
    ↓
Backend sends stage events:
  - {type: "stage", stage: "graph", status: "active", progress: 15}
  - {type: "stage", stage: "graph", status: "complete", progress: 25}
  - {type: "stage", stage: "prepare", status: "active", progress: 30}
  - ... (PREPARE → SIMULATE → REPORT)
    ↓
Backend sends completion:
  - {type: "complete", result: {...}, messageId: 123}
    ↓
Frontend updates UI with prediction card
```

**Timing:**
- GRAPH stage: ~1.1 seconds (simulated delays for UX)
- PREPARE stage: ~0.9 seconds
- SIMULATE stage: ~3-5 seconds (actual LLM processing)
- REPORT stage: ~0.7 seconds
- **Total**: ~6-8 seconds per prediction

---

## 5. Database (Persistent Storage)

### Schema

**`conversations` table:**
```sql
CREATE TABLE conversations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  title VARCHAR(512) NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP
);
```

**`messages` table:**
```sql
CREATE TABLE messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  conversationId INT NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  attachments JSON,  -- [{name, url, type}, ...]
  simulationResult JSON,  -- Full prediction object
  createdAt TIMESTAMP DEFAULT NOW()
);
```

**`users` table (pre-existing):**
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  openId VARCHAR(64) UNIQUE NOT NULL,  -- Manus OAuth ID
  name TEXT,
  email VARCHAR(320),
  loginMethod VARCHAR(64),
  role ENUM('user', 'admin') DEFAULT 'user',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP,
  lastSignedIn TIMESTAMP DEFAULT NOW()
);
```

### Data Persistence Flow

```
User sends question
    ↓
Backend creates user message row in messages table
    ↓
Backend creates assistant message row (placeholder)
    ↓
LLM processes → generates prediction
    ↓
Backend updates assistant message row with simulationResult JSON
    ↓
Frontend queries messages.list to reload conversation
    ↓
All messages displayed from database
```

---

## 6. Authentication & User Context

### OAuth Flow

**Where user data comes from:**
- **Manus OAuth service** (built-in authentication)
- User logs in → OAuth callback at `/api/oauth/callback`
- Session cookie set with JWT token
- User context injected into every tRPC call via `ctx.user`

**User identification:**
- Each message/conversation is tied to `userId` (from `users.id`)
- Users can only see their own conversations
- Enforced in backend: `getConversationById(id, userId)` checks ownership

---

## 7. Frontend State Management

### React Query + tRPC

**Data fetching:**
```typescript
// List conversations
const { data: conversations } = trpc.conversations.list.useQuery();

// Get single conversation with messages
const { data: conversationData } = trpc.conversations.get.useQuery({ id: 1 });

// Send message & trigger simulation
const sendMessage = trpc.messages.sendAndSimulate.useMutation();
```

**Local state:**
- Messages array in React state (loaded from DB)
- Input text in textarea state
- Attachments preview in local state
- Workflow progress (GRAPH/PREPARE/SIMULATE/REPORT) updated via SSE events

---

## 8. Complete Data Journey Example

### Scenario: User asks "If a product raises its price, how will sentiment change?"

```
1. USER TYPES QUESTION
   ├─ Text: "If a product raises its price..."
   └─ Attachments: [market_research.pdf]

2. FRONTEND SENDS TO BACKEND
   └─ POST /api/trpc/messages.sendAndSimulate
      ├─ conversationId: 5
      ├─ content: "If a product raises its price..."
      └─ attachments: [{name: "market_research.pdf", url: "https://cdn.../...", type: "application/pdf"}]

3. BACKEND PROCESSES
   ├─ Saves user message to messages table
   ├─ Creates placeholder assistant message
   ├─ Starts SSE stream to frontend
   └─ Calls invokeLLM with:
      ├─ System prompt: "You are MiroFish..."
      ├─ User prompt: "Analyze: If a product raises its price...\n\nAttached files: market_research.pdf"
      └─ Response format: JSON schema

4. LLM GENERATES PREDICTION
   ├─ Calls Manus Forge API (BUILT_IN_FORGE_API_URL)
   ├─ Returns structured JSON:
   │  ├─ summary: "Product price increases typically reduce..."
   │  ├─ confidence: 0.82
   │  ├─ scenarios: [
   │  │  ├─ {name: "Price Elasticity", probability: 0.65, ...}
   │  │  ├─ {name: "Brand Loyalty Override", probability: 0.25, ...}
   │  │  └─ {name: "Market Shift", probability: 0.10, ...}
   │  └─ followUpQuestions: ["How does competitor pricing affect this?", ...]

5. REAL-TIME UPDATES VIA SSE
   ├─ {type: "stage", stage: "graph", status: "active", progress: 15}
   ├─ {type: "stage", stage: "graph", status: "complete", progress: 25}
   ├─ {type: "stage", stage: "prepare", status: "active", progress: 30}
   ├─ ... (continues through SIMULATE & REPORT)
   └─ {type: "complete", result: {...}, messageId: 42}

6. BACKEND SAVES RESULT
   └─ UPDATE messages SET simulationResult = {...} WHERE id = 42

7. FRONTEND DISPLAYS
   ├─ User message bubble (right-aligned, teal)
   ├─ Workflow pills (GRAPH ✓ PREPARE ✓ SIMULATE ✓ REPORT ✓ 100%)
   ├─ Prediction card with:
   │  ├─ Summary text
   │  ├─ Confidence bar (82%)
   │  ├─ Key factors tags
   │  ├─ Scenario cards with probability bars
   │  ├─ Expandable report sections
   │  └─ Follow-up question buttons

8. USER CLICKS FOLLOW-UP
   └─ "How does competitor pricing affect this?"
      └─ Repeats entire flow (steps 1-7)
```

---

## 9. Data Sources Summary

| Data Type | Source | Storage | Access |
|-----------|--------|---------|--------|
| **User questions** | User input (frontend textarea) | MySQL `messages.content` | tRPC query |
| **File attachments** | User filesystem | S3 cloud storage | Public CDN URL |
| **AI predictions** | Manus Forge LLM API | MySQL `messages.simulationResult` JSON | tRPC query |
| **Conversation metadata** | User creates conversation | MySQL `conversations` table | tRPC query |
| **User identity** | Manus OAuth | MySQL `users` table | Session cookie |
| **Workflow progress** | Backend SSE stream | Frontend React state (ephemeral) | SSE events |
| **Sample questions** | Hardcoded in code | Frontend component | Direct import |

---

## 10. Key Integration Points

### Environment Variables (Injected by Manus)
```
BUILT_IN_FORGE_API_URL=https://api.manus.im/forge/...
BUILT_IN_FORGE_API_KEY=sk-...
DATABASE_URL=mysql://user:pass@host/db
JWT_SECRET=...
VITE_APP_ID=...
OAUTH_SERVER_URL=...
```

### External Services
- **Manus Forge API** — LLM inference (GPT-4 or equivalent)
- **Manus OAuth** — User authentication
- **S3 (via Manus)** — File storage
- **MySQL (via Manus)** — Data persistence

### No External APIs Called
- ✗ OpenAI API (uses Manus Forge instead)
- ✗ Third-party data providers
- ✗ External knowledge bases
- ✗ Real market data feeds

**Everything is self-contained within the Manus platform.**

---

## 11. Data Privacy & Security

- **User isolation**: Each user can only access their own conversations
- **File security**: Uploaded files stored in S3 with access control
- **API authentication**: All backend routes require valid JWT session
- **LLM context**: Only current question + optional attachments sent to LLM (no user history leaked)
- **Database encryption**: Handled by Manus platform

---

## Summary

**The MiroFish clone generates data through a sophisticated pipeline:**

1. **Input**: User questions + optional file attachments
2. **Processing**: Manus Forge LLM API (structured JSON schema)
3. **Streaming**: Real-time SSE events show progress (GRAPH → PREPARE → SIMULATE → REPORT)
4. **Storage**: MySQL database persists conversations, messages, and predictions
5. **Display**: Frontend renders prediction cards with confidence, scenarios, reports, and follow-ups
6. **Iteration**: User can click follow-up questions to start new simulations

**All data is generated by the LLM on-demand** — there's no pre-existing dataset or external knowledge base. Each prediction is unique to the user's question, creating a truly interactive scenario planning experience.
