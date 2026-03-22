# Project 26 - LLM API Comparison Guide

Comprehensive comparison of LLM APIs for scenario prediction, including free options, Manus Forge, and commercial alternatives.

---

## Quick Answer

**Yes, you can keep using Manus Forge API** if you stay on Manus platform. However, if you export to your own infrastructure, here are the best free/cheap alternatives:

| API | Free Tier | Best For | Recommendation |
|-----|-----------|----------|-----------------|
| **Manus Forge** | ✅ Included | Staying on Manus | ⭐ Best if not exporting |
| **OpenAI GPT-4o** | ❌ No (pay-per-use) | Production quality | ⭐⭐⭐ Best paid option |
| **Anthropic Claude** | ❌ No (pay-per-use) | Long context, reasoning | ⭐⭐⭐ Best for complex analysis |
| **Google Gemini** | ✅ Free tier | Budget-friendly | ⭐⭐ Good free option |
| **Ollama (Local)** | ✅ Completely free | Self-hosted, privacy | ⭐⭐⭐ Best for cost control |
| **LLaMA 2 (Meta)** | ✅ Open source | Self-hosted, no API costs | ⭐⭐⭐ Best for scale |
| **Mistral** | ✅ Free tier | Fast, efficient | ⭐⭐ Good alternative |
| **Together AI** | ✅ Free credits | Open source models | ⭐⭐ Good for testing |

---

## Option 1: Keep Using Manus Forge (Recommended if Staying on Manus)

### Pros
- ✅ Already integrated in your code
- ✅ No additional setup required
- ✅ Optimized for Manus platform
- ✅ Included with Manus subscription
- ✅ No per-token costs
- ✅ Built-in rate limiting & monitoring

### Cons
- ❌ Locked into Manus platform
- ❌ Can't export to other hosting
- ❌ Limited customization

### Current Implementation
```typescript
// Already working in your code
import { invokeLLM } from "./server/_core/llm";

const response = await invokeLLM({
  messages: [{ role: "user", content: "Your question" }],
  response_format: { type: "json_schema", ... }
});
```

### Cost
- **Included with Manus subscription** (no additional cost)

### Recommendation
**✅ BEST CHOICE** if you're staying on Manus platform and don't need to export.

---

## Option 2: Google Gemini (Free Tier + Cheap)

### Free Tier
- **60 requests per minute** (RPM)
- **2 million tokens per month** (free)
- **Gemini 1.5 Flash** (fast, cheap model)
- **Gemini 1.5 Pro** (better quality, limited free)

### Paid Tier
- **$0.075 per 1M input tokens** (Flash)
- **$0.30 per 1M input tokens** (Pro)
- **$0.30 per 1M output tokens** (Flash)
- **$1.20 per 1M output tokens** (Pro)

### Estimated Monthly Cost (Active Users)
- 100 users × 10 predictions/month = 1,000 predictions
- ~500K tokens/month = **~$37.50/month**

### Implementation
```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function invokeLLM(params: {
  messages: Array<{ role: string; content: string }>;
  response_format?: any;
}) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const response = await model.generateContent({
    contents: params.messages.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    })),
  });

  return {
    choices: [
      {
        message: {
          content: response.response.text(),
        },
      },
    ],
  };
}
```

### Pros
- ✅ Free tier available (2M tokens/month)
- ✅ Cheap pricing ($0.075 per 1M tokens)
- ✅ Fast responses (Flash model)
- ✅ Good quality for scenario analysis
- ✅ Easy to set up

### Cons
- ❌ Free tier has rate limits (60 RPM)
- ❌ Less context window than Claude
- ❌ Requires Google Cloud account

### Recommendation
**⭐⭐ GOOD CHOICE** for startups with moderate usage. Free tier covers ~2,000 predictions/month.

---

## Option 3: Ollama (Self-Hosted, Completely Free)

### What is Ollama?
- **Open source LLM runner** that runs models locally on your server
- **No API costs** (only compute costs)
- **Complete privacy** (data never leaves your server)
- **Supports**: LLaMA 2, Mistral, Neural Chat, Dolphin, etc.

### Free Models Available
- **LLaMA 2 (7B)** - Fast, good quality
- **Mistral (7B)** - Faster, efficient
- **Neural Chat (7B)** - Optimized for chat
- **Dolphin (7B)** - Good reasoning

### Installation
```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama2
ollama pull mistral

# Start server
ollama serve
```

### Implementation
```typescript
import axios from "axios";

export async function invokeLLM(params: {
  messages: Array<{ role: string; content: string }>;
  response_format?: any;
}) {
  const response = await axios.post("http://localhost:11434/api/chat", {
    model: "mistral", // or "llama2"
    messages: params.messages,
    stream: false,
  });

  return {
    choices: [
      {
        message: {
          content: response.data.message.content,
        },
      },
    ],
  };
}
```

### Pros
- ✅ **Completely free** (no API costs)
- ✅ **Complete privacy** (no data sent to third parties)
- ✅ **No rate limits** (unlimited requests)
- ✅ **Fast responses** (local inference)
- ✅ **Full control** over models and parameters
- ✅ **Works offline** (no internet required)

### Cons
- ❌ **Requires server resources** (GPU recommended)
- ❌ **Lower quality** than GPT-4/Claude
- ❌ **Slower** than cloud APIs (without GPU)
- ❌ **Setup complexity** (need to manage server)
- ❌ **Not ideal for complex reasoning**

### Server Requirements
- **CPU-only**: 8GB RAM, ~5-10 seconds per prediction
- **With GPU**: 4GB VRAM, ~1-2 seconds per prediction (recommended)

### Cost Analysis
- **Compute**: If using Railway/AWS, ~$20-50/month for GPU server
- **API**: $0 (completely free)
- **Total**: ~$20-50/month (vs $150+ for cloud APIs)

### Recommendation
**⭐⭐⭐ BEST FOR COST CONTROL** if you're willing to manage infrastructure. Saves 70-80% on API costs.

---

## Option 4: Anthropic Claude (Best Quality, Paid)

### Pricing
- **$0.003 per 1K input tokens** (Claude 3 Haiku)
- **$0.015 per 1K input tokens** (Claude 3 Sonnet)
- **$0.80 per 1K input tokens** (Claude 3 Opus)
- **Output tokens cost 3-4x more**

### Estimated Monthly Cost (Active Users)
- 100 users × 10 predictions/month = 1,000 predictions
- ~500K tokens/month = **~$1.50-7.50/month** (Haiku) or **$7.50-30/month** (Sonnet)

### Why Claude for Scenario Prediction?
- ✅ **Best reasoning** (better for complex analysis)
- ✅ **Longest context** (200K tokens, vs GPT-4's 128K)
- ✅ **Better at structured output** (JSON schemas)
- ✅ **More consistent** predictions
- ✅ **Better at "what-if" analysis**

### Implementation
```typescript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function invokeLLM(params: {
  messages: Array<{ role: string; content: string }>;
  response_format?: any;
}) {
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 2048,
    messages: params.messages,
  });

  return {
    choices: [
      {
        message: {
          content: response.content[0]?.type === "text" ? response.content[0].text : "",
        },
      },
    ],
  };
}
```

### Pros
- ✅ **Best quality reasoning** (ideal for scenario analysis)
- ✅ **Longest context window** (200K tokens)
- ✅ **Structured output support** (JSON schemas)
- ✅ **Most consistent** predictions
- ✅ **Best for complex "what-if" scenarios**

### Cons
- ❌ **No free tier** (pay-per-use only)
- ❌ **Slightly more expensive** than OpenAI for some use cases
- ❌ **Slower** than GPT-4o

### Recommendation
**⭐⭐⭐ BEST FOR QUALITY** if budget allows. Produces the most accurate predictions.

---

## Option 5: OpenAI GPT-4o (Best Balance)

### Pricing
- **$0.005 per 1K input tokens** (GPT-4o)
- **$0.015 per 1K output tokens** (GPT-4o)
- **$0.15 per 1K input tokens** (GPT-4 Turbo)
- **$0.30 per 1K output tokens** (GPT-4 Turbo)

### Estimated Monthly Cost (Active Users)
- 100 users × 10 predictions/month = 1,000 predictions
- ~500K tokens/month = **~$2.50-7.50/month** (GPT-4o)

### Why GPT-4o for Scenario Prediction?
- ✅ **Best speed/quality balance**
- ✅ **Cheapest of premium models**
- ✅ **Excellent at structured output**
- ✅ **Great for scenario branching**
- ✅ **Most reliable**

### Implementation
```typescript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function invokeLLM(params: {
  messages: Array<{ role: string; content: string }>;
  response_format?: any;
}) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: params.messages as any,
    response_format: params.response_format,
    temperature: 0.7,
  });

  return {
    choices: [
      {
        message: {
          content: response.choices[0]?.message.content || "",
        },
      },
    ],
  };
}
```

### Pros
- ✅ **Best price/quality ratio**
- ✅ **Fastest responses**
- ✅ **Excellent structured output**
- ✅ **Most reliable**
- ✅ **Large community & support**

### Cons
- ❌ **No free tier**
- ❌ **Slightly lower reasoning** than Claude
- ❌ **Shorter context** than Claude (128K vs 200K)

### Recommendation
**⭐⭐⭐ BEST OVERALL** for most projects. Best balance of cost, speed, and quality.

---

## Option 6: Together AI (Free Credits + Open Source)

### Free Tier
- **$5 free credits** (usually covers 1-2 weeks of usage)
- **Access to open source models** (LLaMA, Mistral, etc.)
- **Competitive pricing** after credits run out

### Models Available
- **LLaMA 2 (70B)** - Better quality than 7B
- **Mistral (7B)** - Fast and efficient
- **Falcon (40B)** - Good reasoning

### Pricing (After Free Credits)
- **$0.002 per 1K tokens** (LLaMA 2 7B)
- **$0.006 per 1K tokens** (LLaMA 2 70B)
- **$0.01 per 1K tokens** (Mistral)

### Implementation
```typescript
import axios from "axios";

export async function invokeLLM(params: {
  messages: Array<{ role: string; content: string }>;
}) {
  const response = await axios.post(
    "https://api.together.xyz/inference",
    {
      model: "meta-llama/Llama-2-70b-chat-hf",
      prompt: params.messages[params.messages.length - 1].content,
      max_tokens: 2048,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
      },
    }
  );

  return {
    choices: [
      {
        message: {
          content: response.data.output.choices[0].text,
        },
      },
    ],
  };
}
```

### Pros
- ✅ **$5 free credits** to start
- ✅ **Very cheap** after credits ($0.002-0.01 per 1K tokens)
- ✅ **Open source models** (privacy-friendly)
- ✅ **Good for testing**

### Cons
- ❌ **Lower quality** than GPT-4/Claude
- ❌ **Slower responses**
- ❌ **Limited free credits** ($5 only)

### Recommendation
**⭐⭐ GOOD FOR TESTING** before committing to paid APIs.

---

## Cost Comparison (100 Active Users, 10 Predictions/Month)

| API | Free Tier | Monthly Cost | Quality | Speed | Notes |
|-----|-----------|--------------|---------|-------|-------|
| **Manus Forge** | ✅ Included | $0 | ⭐⭐⭐ | ⭐⭐⭐ | Best if staying on Manus |
| **Ollama (Self-hosted)** | ✅ Free | $20-50 | ⭐⭐ | ⭐⭐ | Lowest cost, requires GPU |
| **Google Gemini** | ✅ 2M tokens | $37.50 | ⭐⭐⭐ | ⭐⭐⭐ | Good free tier |
| **Together AI** | ✅ $5 credits | $10-20 | ⭐⭐ | ⭐⭐ | Cheapest after free tier |
| **OpenAI GPT-4o** | ❌ No | $5-15 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Best overall |
| **Anthropic Claude** | ❌ No | $10-30 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Best quality |

---

## Recommendation by Scenario

### Scenario 1: Staying on Manus Platform
**→ Use Manus Forge** (already integrated, no additional cost)

### Scenario 2: Exporting, Budget-Conscious
**→ Use Ollama** (self-hosted, completely free, save 70-80%)

### Scenario 3: Exporting, Want Free Tier
**→ Use Google Gemini** (free tier covers ~2,000 predictions/month)

### Scenario 4: Exporting, Want Best Quality
**→ Use Anthropic Claude** (best reasoning for scenario analysis)

### Scenario 5: Exporting, Want Best Balance
**→ Use OpenAI GPT-4o** (best price/quality, fastest)

### Scenario 6: Exporting, Want to Test First
**→ Use Together AI** ($5 free credits, then decide)

---

## Hybrid Approach (Recommended for Scale)

Use **multiple APIs** to optimize cost and quality:

```typescript
export async function invokeLLM(params: any) {
  // For simple predictions: use Gemini (cheapest)
  if (params.complexity === "simple") {
    return await callGemini(params);
  }

  // For complex analysis: use Claude (best reasoning)
  if (params.complexity === "complex") {
    return await callClaude(params);
  }

  // For fast responses: use GPT-4o
  if (params.speed === "critical") {
    return await callOpenAI(params);
  }

  // Fallback: use Ollama (free, local)
  return await callOllama(params);
}
```

**Estimated Savings**: 40-60% compared to single provider

---

## Setup Instructions by Choice

### If Staying on Manus
No changes needed! Keep using `invokeLLM` from `server/_core/llm.ts`

### If Switching to OpenAI
```bash
pnpm add openai
# Set OPENAI_API_KEY in .env
# Replace import in server/routers.ts
```

### If Switching to Claude
```bash
pnpm add @anthropic-ai/sdk
# Set ANTHROPIC_API_KEY in .env
# Replace import in server/routers.ts
```

### If Using Ollama
```bash
# Install Ollama on your server
curl https://ollama.ai/install.sh | sh
ollama pull mistral
ollama serve

# No npm package needed (uses HTTP API)
```

### If Using Google Gemini
```bash
pnpm add @google/generative-ai
# Set GOOGLE_API_KEY in .env
# Replace import in server/routers.ts
```

---

## Final Recommendation

| If You're... | Use... | Cost | Why |
|--------------|--------|------|-----|
| Staying on Manus | **Manus Forge** | $0 | Already integrated |
| Cost-conscious | **Ollama** | $20-50/mo | Lowest total cost |
| Want free tier | **Google Gemini** | $0-40/mo | Free tier available |
| Want best quality | **Claude** | $10-30/mo | Best reasoning |
| Want best balance | **GPT-4o** | $5-15/mo | ⭐ RECOMMENDED |

**My top recommendation: If exporting, use OpenAI GPT-4o.** It offers the best balance of cost ($5-15/month), quality (⭐⭐⭐⭐), and speed for scenario prediction.

If you want to minimize costs, combine **Gemini** (for simple predictions) + **Ollama** (for complex analysis) = ~$20-40/month total.
