# Project 26 - Export & Independence Guide

This guide explains how to export Project 26 from Manus and make it fully independent, including which APIs and platforms to use.

---

## Current Architecture (Manus-Dependent)

Your Project 26 currently uses:

| Component | Current (Manus) | What It Does |
|-----------|-----------------|--------------|
| **LLM API** | `BUILT_IN_FORGE_API_URL` + `BUILT_IN_FORGE_API_KEY` | AI predictions, scenario generation |
| **Authentication** | Manus OAuth (`OAUTH_SERVER_URL`) | User login, session management |
| **Database** | MySQL (TiDB) via `DATABASE_URL` | Conversations, messages, predictions |
| **File Storage** | S3 via Manus | PDF/MD/TXT attachments |
| **Hosting** | Manus Platform | Server deployment, domain |
| **Analytics** | Manus built-in | User tracking, metrics |

---

## Step 1: Export Code to GitHub

### Option A: Use Manus Management UI (Easiest)
1. Go to **Settings → GitHub** in Manus Management UI
2. Click **"Export to GitHub"**
3. Select your GitHub account and repository name
4. Manus will push all code to your GitHub repo

### Option B: Manual Export via Git
```bash
# Clone the project locally
git clone <your-manus-repo-url>
cd mirofish-clone

# Create new GitHub repo
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/project-26.git
git branch -M main
git push -u origin main
```

---

## Step 2: Replace Manus LLM with OpenAI or Anthropic

### Current Manus Implementation
```typescript
// server/_core/llm.ts
import { invokeLLM } from "./server/_core/llm";

const response = await invokeLLM({
  messages: [{ role: "user", content: "Your question" }],
  response_format: { type: "json_schema", ... }
});
```

### Migration: Use OpenAI API

**1. Install OpenAI SDK**
```bash
pnpm add openai
```

**2. Create `server/llm-openai.ts`**
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
    model: "gpt-4-turbo",
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

**3. Update `server/routers.ts`**
```typescript
// Replace: import { invokeLLM } from "./server/_core/llm";
import { invokeLLM } from "./llm-openai";
```

**4. Add Environment Variable**
```bash
# .env or deployment config
OPENAI_API_KEY=sk-...
```

### Alternative: Use Anthropic Claude

```bash
pnpm add @anthropic-ai/sdk
```

```typescript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function invokeLLM(params: any) {
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

---

## Step 3: Replace Manus Auth with Auth0 or Supabase

### Option A: Auth0 (Recommended for Enterprise)

**1. Create Auth0 Account**
- Sign up at https://auth0.com
- Create a new application (type: Regular Web Application)
- Get: Domain, Client ID, Client Secret

**2. Install Auth0 SDK**
```bash
pnpm add auth0
```

**3. Create `server/auth-auth0.ts`**
```typescript
import { ManagementClient } from "auth0";

const auth0 = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
});

export async function getUserByAuth0Id(auth0Id: string) {
  // Fetch user from Auth0
  const user = await auth0.users.get({ id: auth0Id });
  return user;
}
```

**4. Update OAuth Callback**
Replace Manus OAuth with Auth0 in `server/_core/oauth.ts`

### Option B: Supabase (Easier for Startups)

**1. Create Supabase Project**
- Sign up at https://supabase.com
- Create new project
- Get: Project URL, Anon Key, Service Role Key

**2. Install Supabase Auth**
```bash
pnpm add @supabase/supabase-js
```

**3. Use Supabase Auth**
```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Supabase handles auth automatically
```

---

## Step 4: Replace Manus Database with Your Own

### Current: Manus MySQL/TiDB
```
DATABASE_URL=mysql://user:pass@host:3306/db
```

### Option A: Self-Hosted MySQL

**1. Set up MySQL Server**
```bash
# Using Docker
docker run -d \
  -e MYSQL_ROOT_PASSWORD=your_password \
  -e MYSQL_DATABASE=project26 \
  -p 3306:3306 \
  mysql:8.0
```

**2. Update Connection String**
```bash
DATABASE_URL=mysql://root:your_password@localhost:3306/project26
```

**3. Run Migrations**
```bash
pnpm drizzle-kit migrate
```

### Option B: Managed Database (Recommended)

| Provider | Cost | Features |
|----------|------|----------|
| **PlanetScale** | Free tier + $29/mo | MySQL-compatible, serverless, auto-scaling |
| **AWS RDS** | $15-100/mo | Fully managed, backups, multi-region |
| **Supabase PostgreSQL** | Free tier + $25/mo | PostgreSQL, built-in auth, real-time |
| **Railway** | Pay-as-you-go | Simple deployment, MySQL included |

**Using PlanetScale (Easiest)**
```bash
# 1. Create account at https://planetscale.com
# 2. Create database "project26"
# 3. Get connection string from "Connect" button
# 4. Update .env
DATABASE_URL=mysql://user:password@aws.connect.psdb.cloud/project26?sslaccept=strict
```

---

## Step 5: Replace Manus File Storage with S3

### Current: Manus S3 Wrapper
```typescript
import { storagePut } from "./server/storage";
const { url } = await storagePut(fileKey, buffer, "application/pdf");
```

### Migration: Direct AWS S3

**1. Create AWS Account & S3 Bucket**
- Sign up at https://aws.amazon.com
- Create S3 bucket (e.g., `project26-files`)
- Create IAM user with S3 access
- Get: Access Key ID, Secret Access Key

**2. Install AWS SDK**
```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**3. Create `server/storage-s3.ts`**
```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function storagePut(key: string, data: Buffer, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    Body: data,
    ContentType: contentType,
  });

  await s3.send(command);

  const url = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`;
  return { url, key };
}
```

**4. Update Imports**
```typescript
// Replace: import { storagePut } from "./server/storage";
import { storagePut } from "./server/storage-s3";
```

### Alternative: Cloudinary (Easier for Images)

```bash
pnpm add cloudinary
```

```typescript
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function storagePut(key: string, data: Buffer) {
  const result = await cloudinary.uploader.upload_stream(
    { resource_type: "auto", public_id: key },
    (error, result) => result
  ).end(data);

  return { url: result.secure_url, key };
}
```

---

## Step 6: Deploy to Your Own Server

### Option A: Railway (Easiest)

**1. Push Code to GitHub**
```bash
git push origin main
```

**2. Create Railway Account**
- Sign up at https://railway.app
- Connect GitHub
- Select your `project-26` repo

**3. Add Environment Variables**
```
OPENAI_API_KEY=sk-...
DATABASE_URL=mysql://...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=project26-files
AWS_REGION=us-east-1
```

**4. Deploy**
- Railway automatically detects Node.js + Vite
- Builds and deploys automatically

### Option B: Vercel (For Frontend Only)

**1. Deploy Frontend**
```bash
pnpm install -g vercel
vercel
```

**2. Deploy Backend Separately**
- Use Railway, Render, or Heroku for the Express server

### Option C: Self-Hosted (Docker)

**1. Create `Dockerfile`**
```dockerfile
FROM node:22-alpine

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .
RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "start"]
```

**2. Deploy to VPS**
```bash
# Using DigitalOcean, Linode, AWS EC2, etc.
docker build -t project26 .
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=sk-... \
  -e DATABASE_URL=mysql://... \
  project26
```

---

## Step 7: Replace Analytics with Posthog or Mixpanel

### Current: Manus Analytics
```typescript
// Manus built-in tracking
```

### Migration: PostHog (Open Source)

**1. Create PostHog Account**
- Sign up at https://posthog.com
- Get API Key

**2. Install PostHog**
```bash
pnpm add posthog-js
```

**3. Add to Frontend (`client/src/main.tsx`)**
```typescript
import posthog from "posthog-js";

posthog.init(process.env.VITE_POSTHOG_KEY, {
  api_host: "https://us.posthog.com",
});
```

**4. Track Events**
```typescript
posthog.capture("simulation_started", {
  question: userQuestion,
  timestamp: new Date(),
});
```

---

## Complete Migration Checklist

- [ ] Export code to GitHub
- [ ] Replace Manus LLM with OpenAI/Anthropic
- [ ] Replace Manus Auth with Auth0/Supabase
- [ ] Migrate database to PlanetScale/AWS RDS
- [ ] Set up AWS S3 for file storage
- [ ] Update all environment variables
- [ ] Test all features locally
- [ ] Deploy to Railway/Vercel/Self-hosted
- [ ] Set up custom domain (e.g., project26.com)
- [ ] Set up SSL certificate (Let's Encrypt)
- [ ] Configure analytics (PostHog/Mixpanel)
- [ ] Set up monitoring & error tracking (Sentry)

---

## Cost Breakdown (Monthly)

| Service | Free Tier | Paid Tier | Notes |
|---------|-----------|-----------|-------|
| **OpenAI API** | N/A | $0.01-0.10 per 1K tokens | ~$50-200/mo for active users |
| **Auth0** | 7,000 users | $23+ | Free tier usually sufficient |
| **PlanetScale** | 5GB storage | $29+ | MySQL-compatible, scales well |
| **AWS S3** | 5GB free | $0.023 per GB | Cheap for file storage |
| **Railway** | $5/mo credit | $5-50/mo | Simple, includes database |
| **PostHog** | Free (self-hosted) | $29+/mo | Great for analytics |
| **Sentry** | Free tier | $29+/mo | Error tracking |
| **Total** | ~$0-5 | ~$100-300/mo | Scales with usage |

---

## Environment Variables to Update

```bash
# LLM
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=claude-...

# Database
DATABASE_URL=mysql://user:pass@host:3306/db

# Auth
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
# or
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=...

# Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=project26-files
AWS_REGION=us-east-1

# Analytics
VITE_POSTHOG_KEY=...

# Domain
VITE_APP_TITLE=Project 26
VITE_APP_LOGO=https://your-domain.com/logo.png
```

---

## Recommended Stack for Independence

| Layer | Recommendation | Why |
|-------|-----------------|-----|
| **LLM** | OpenAI GPT-4 | Best quality, most reliable |
| **Auth** | Supabase | Easiest to set up, includes database |
| **Database** | PlanetScale | MySQL-compatible, serverless, scales |
| **Storage** | AWS S3 | Industry standard, cheap, reliable |
| **Hosting** | Railway | Simplest deployment, good pricing |
| **Analytics** | PostHog | Open source option, privacy-friendly |
| **Monitoring** | Sentry | Error tracking, performance monitoring |
| **Domain** | Namecheap/Route53 | Custom domain, DNS management |

**Total Setup Time**: ~2-3 hours  
**Total Monthly Cost**: ~$150-250 (scales with usage)

---

## Next Steps

1. **Create GitHub repo** and push code
2. **Sign up for OpenAI** and get API key
3. **Choose deployment platform** (Railway recommended)
4. **Update environment variables**
5. **Test locally** with new APIs
6. **Deploy** and monitor

You'll be fully independent and own everything!
