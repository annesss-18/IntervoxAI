<div align="center">
  <img src="./public/icon.png" alt="IntervoxAI logo" width="58" />
  <h1>IntervoxAI</h1>
  <p><strong>Practice. Speak. Improve.</strong></p>
  <p><em>Real interviews. Real feedback. Faster growth.</em></p>

  <p>
    <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
    <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white" />
    <img alt="Firebase" src="https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase&logoColor=black" />
    <img alt="Gemini" src="https://img.shields.io/badge/Gemini-Live%20API-4285F4?logo=google&logoColor=white" />
  </p>

  <p>
    <a href="#features">Features</a> &bull;
    <a href="#tech-stack">Tech Stack</a> &bull;
    <a href="#getting-started">Getting Started</a> &bull;
    <a href="#deployment">Deployment</a> &bull;
    <a href="#contributing">Contributing</a>
  </p>
</div>

---

<a id="overview"></a>

## <img src="https://cdn.jsdelivr.net/npm/lucide-static/icons/file-text.svg" alt="" width="18" /> Overview

**IntervoxAI** is a voice-first mock interview platform for realistic technical interview practice.

It combines:

- Live conversational interview simulation with Gemini Live
- Job-description-driven template generation
- Resume-aware interview context
- Structured post-interview feedback with scoring and coaching

The codebase follows a layered architecture:

```text
UI -> API routes -> services -> repositories -> Firestore
```

---

<a id="features"></a>

## <img src="https://cdn.jsdelivr.net/npm/lucide-static/icons/sparkles.svg" alt="" width="18" /> Features

### Core product capabilities

- **Authentication**
  - Firebase Auth with email/password and Google sign-in
  - Secure server-side session cookies

- **Template studio**
  - Analyze a JD from text, URL, or file
  - Extract role, company, level, type, and tech stack
  - Generate interview questions, focus areas, and interviewer persona

- **Explore**
  - Browse public interview templates
  - Sort by usage count or creation date
  - Start a session from any public template

- **Live interviews**
  - Real-time microphone streaming to Gemini Live
  - AI audio playback, captions, and session controls
  - Resume-aware context and guided follow-ups

- **Feedback engine**
  - Transcript queueing and async processing
  - Category scoring, strengths, gaps, and coaching
  - Durable QStash worker path with a local `after()` fallback

### Platform hardening

- Auth middleware for protected routes
- Route-level rate limiting with Upstash Redis in production
- SSRF-safe JD extraction
- Resume encryption at rest with AES-256-GCM
- CSP and security headers in Next.js

---

<a id="tech-stack"></a>

## <img src="https://cdn.jsdelivr.net/npm/lucide-static/icons/cpu.svg" alt="" width="18" /> Tech Stack

| Layer         | Technologies                                             |
| ------------- | -------------------------------------------------------- |
| Frontend      | Next.js 16, React 19, Tailwind CSS 4                     |
| UI System     | Radix UI, Lucide React icons                             |
| Theming       | next-themes, CSS variables                               |
| Typography    | DM Sans, Instrument Serif, JetBrains Mono                |
| Validation    | Zod, React Hook Form                                     |
| AI            | `@google/genai`, `@ai-sdk/google`, `ai`                  |
| Data          | Firestore, Firebase Admin SDK                            |
| Auth          | Firebase Auth, session cookies                           |
| Rate limiting | Upstash Redis, `@upstash/ratelimit`                      |
| Queueing      | Upstash QStash                                           |
| Parsing       | `unpdf`, `mammoth`, `cheerio`                            |
| Notifications | Sonner                                                   |
| Analytics     | Vercel Analytics                                         |

---

## <img src="https://cdn.jsdelivr.net/npm/lucide-static/icons/network.svg" alt="" width="18" /> Architecture

```text
Client (Next.js App Router UI)
  -> API routes (/app/api/*)
    -> Service layer (/lib/services)
      -> Repository layer (/lib/repositories)
        -> Firestore
```

### Real-time interview flow

```text
Mic input -> useAudioCapture -> /api/live/token -> Gemini Live
Gemini audio and transcript -> live interview UI
Interview end -> /api/feedback -> /api/feedback/process -> feedback document
```

---

## <img src="https://cdn.jsdelivr.net/npm/lucide-static/icons/folder-tree.svg" alt="" width="18" /> Project Structure

```text
app/
  (public)/                  Marketing, docs, legal, support, pricing, explore
  (auth)/                    Sign-in and sign-up
  (root)/                    Dashboard, template details, sessions, live interview
  api/                       Route handlers
components/
  atoms/                     UI primitives
  molecules/                 Reusable composites
  organisms/                 Feature components
  layout/                    Navbar, Footer, Container
  providers/                 App-level providers
firebase/
  client.ts                  Firebase client SDK setup
  admin.ts                   Firebase Admin SDK setup
lib/
  actions/                   Server actions
  services/                  Business orchestration
  repositories/              Firestore access
  queue/                     Feedback job publishing helpers
  hooks/                     Audio and live interview hooks
  api-middleware.ts          Auth and rate-limit wrappers
  rate-limit.ts              Redis and in-memory rate limiting
  server-utils.ts            Safe file and URL extraction
  resume-crypto.ts           Resume encryption helpers
  icon-utils.ts              Company and tech icon helpers
  logger.ts                  Structured logging
  models.ts                  Centralized Gemini model IDs
  schemas.ts                 Shared Zod schemas
  validation.ts              Validation helpers
  utils.ts                   Shared utilities
  __tests__/                 Vitest coverage
public/
  worklets/                  AudioWorklet source
types/                       Shared TypeScript contracts
constants/                   Shared schemas and mappings
firestore.rules              Firestore security rules
firestore.indexes.json       Firestore composite indexes
vitest.config.ts             Vitest config
```

---

## <img src="https://cdn.jsdelivr.net/npm/lucide-static/icons/workflow.svg" alt="" width="18" /> Core Workflows

### 1. Template generation

1. User submits JD input in the template form.
2. `POST /api/interview/analyze` extracts role context.
3. User confirms role, stack, level, type, and visibility.
4. `POST /api/interview/generate` creates and stores the template.

### 2. Session creation and live interview

1. `POST /api/interview/session/create` creates a session from a template.
2. `LiveInterviewAgent` requests an ephemeral token from `POST /api/live/token`.
3. The browser streams microphone audio to Gemini Live.
4. Transcript data is collected for feedback generation.

### 3. Feedback processing

1. `POST /api/feedback` stores the transcript and marks the session ready.
2. `POST /api/feedback/process` claims the session and dispatches work.
3. `GET /api/feedback/status` polls until the result is complete or failed.
4. Feedback is stored and attached to the session metadata.

---

## <img src="https://cdn.jsdelivr.net/npm/lucide-static/icons/radio.svg" alt="" width="18" /> API Summary

| Route                                | Method        | Auth / Guard      | Purpose                                          |
| ------------------------------------ | ------------- | ----------------- | ------------------------------------------------ |
| `/api/live/token`                    | `POST`        | Yes               | Create Gemini ephemeral token for live interview |
| `/api/resume/parse`                  | `POST`        | Yes               | Parse uploaded PDF, DOCX, or TXT resume          |
| `/api/feedback`                      | `POST`        | Yes               | Queue transcript for feedback                    |
| `/api/feedback/status`               | `GET`         | Yes               | Retrieve feedback processing state               |
| `/api/feedback/process`              | `POST`        | Yes               | Claim a ready session and dispatch feedback work |
| `/api/workers/feedback`              | `POST`        | QStash signed     | Process queued feedback jobs                     |
| `/api/interview/analyze`             | `POST`        | Yes               | Extract role context from a JD                   |
| `/api/interview/generate`            | `POST`        | Yes               | Generate a full interview template               |
| `/api/interview/session/create`      | `POST`        | Yes               | Create an interview session                      |
| `/api/interview/session/[sessionId]` | `GET`,`PATCH` | Yes               | Read or update a session                         |
| `/api/dashboard/sessions`            | `GET`         | Yes               | Fetch paginated dashboard sessions               |
| `/api/user/reconcile-stats`          | `POST`        | Yes               | Rebuild aggregate user stats from source data    |
| `/api/auth/signout`                  | `POST`        | No (rate-limited) | Clear the server session cookie                  |

---

## <img src="https://cdn.jsdelivr.net/npm/lucide-static/icons/database.svg" alt="" width="18" /> Data Model

### Collections

- `users`
  - User profile keyed by Firebase UID

- `interview_templates`
  - Role and company metadata
  - Questions, focus areas, persona, system instruction
  - Visibility and usage stats

- `interview_sessions`
  - Session status (`setup`, `active`, `completed`)
  - Optional transcript and encrypted resume text
  - Feedback processing metadata

- `feedback`
  - Deterministic ID: `${userId}_${interviewId}`
  - Category scores, strengths, gaps, coaching, final assessment

### Rules and indexes

- Security rules: `firestore.rules`
- Composite indexes: `firestore.indexes.json`

---

## <img src="https://cdn.jsdelivr.net/npm/lucide-static/icons/shield-check.svg" alt="" width="18" /> Security and Privacy

- Auth ownership checks gate template and session access.
- Mutation routes validate `Content-Type` and request origin.
- Rate limiting uses Redis in production and an in-memory fallback locally.
- JD extraction blocks SSRF patterns and private-address lookups.
- Resume text is always encrypted at rest.
- Next.js responses include CSP and other defensive headers.

---

<a id="getting-started"></a>

## <img src="https://cdn.jsdelivr.net/npm/lucide-static/icons/play-circle.svg" alt="" width="18" /> Getting Started

### Prerequisites

- Node.js `>= 20.9.0`
- npm
- Firebase project with Auth and Firestore
- Gemini API keys
- Upstash Redis for production deployments

### Installation

```bash
npm install
```

### Environment setup

```bash
cp .env.example .env.local
```

Fill `.env.local` using `.env.example` as the source of truth.

### Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

---

## <img src="https://cdn.jsdelivr.net/npm/lucide-static/icons/key-round.svg" alt="" width="18" /> Environment Variables

| Variable                                   | Required      | Description                                               |
| ------------------------------------------ | ------------- | --------------------------------------------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | Yes           | Firebase client SDK config                                |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Yes           | Firebase client SDK config                                |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | Yes           | Firebase client SDK config                                |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Yes           | Firebase client SDK config                                |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes           | Firebase client SDK config                                |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | Yes           | Firebase client SDK config                                |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`      | Optional      | Firebase Analytics measurement ID                         |
| `FIREBASE_PROJECT_ID`                      | Yes (runtime) | Firebase Admin SDK project ID                             |
| `FIREBASE_CLIENT_EMAIL`                    | Yes (runtime) | Firebase Admin SDK service account email                  |
| `FIREBASE_PRIVATE_KEY`                     | Yes (runtime) | Firebase Admin SDK private key with `\n` escapes          |
| `FIREBASE_DATABASE_ID`                     | Optional      | Firestore database ID, defaults to `prod`                 |
| `TEMPLATE_GENERATION_API_KEY`              | Yes           | Gemini API key for template generation                    |
| `TEMPLATE_GENERATION_MODEL`                | Yes           | Gemini model ID for template generation                   |
| `LIVE_INTERVIEW_API_KEY`                   | Yes           | Gemini API key for live interviews                        |
| `LIVE_INTERVIEW_MODEL`                     | Yes           | Gemini model ID for live interviews                       |
| `FEEDBACK_API_KEY`                         | Yes           | Gemini API key for feedback generation                    |
| `FEEDBACK_MODEL`                           | Yes           | Gemini model ID for feedback generation                   |
| `RESUME_ENCRYPTION_KEY`                    | Yes           | 32-byte base64 key for encrypted resume storage           |
| `NEXT_PUBLIC_BRANDFETCH_CLIENT_ID`         | Optional      | Brandfetch client ID for company logo rendering           |
| `NEXT_PUBLIC_APP_URL`                      | Prod          | Canonical app URL for origin validation and metadata      |
| `UPSTASH_REDIS_REST_URL`                   | Prod          | Upstash Redis URL for distributed rate limiting           |
| `UPSTASH_REDIS_REST_TOKEN`                 | Prod          | Upstash Redis auth token                                  |
| `QSTASH_TOKEN`                             | Optional      | Upstash QStash token for durable feedback jobs            |
| `QSTASH_CURRENT_SIGNING_KEY`               | Optional      | Current QStash request signing key                        |
| `QSTASH_NEXT_SIGNING_KEY`                  | Optional      | Next rotating QStash signing key                          |

---

## <img src="https://cdn.jsdelivr.net/npm/lucide-static/icons/terminal-square.svg" alt="" width="18" /> Available Scripts

| Script          | Command                 | Purpose                              |
| --------------- | ----------------------- | ------------------------------------ |
| Dev             | `npm run dev`           | Start Next.js dev server             |
| Dev (webpack)   | `npm run dev:webpack`   | Start dev server with webpack        |
| Build           | `npm run build`         | Create the production build          |
| Start           | `npm run start`         | Run the production build             |
| Lint            | `npm run lint`          | Run ESLint                           |
| Lint fix        | `npm run lint:fix`      | Auto-fix lint issues                 |
| Type check      | `npm run type-check`    | Run TypeScript checks                |
| Test            | `npm test`              | Run the Vitest suite                 |
| Test watch      | `npm run test:watch`    | Run Vitest in watch mode             |
| Test coverage   | `npm run test:coverage` | Run Vitest with coverage output      |
| CI check        | `npm run ci:check`      | Run lint, type checks, tests, build  |

---

<a id="deployment"></a>

## <img src="https://cdn.jsdelivr.net/npm/lucide-static/icons/cloud-upload.svg" alt="" width="18" /> Deployment

1. Set all required environment variables on your hosting platform.
2. Deploy Firestore rules and indexes:
   ```bash
   npx firebase deploy --only firestore:rules
   npx firebase deploy --only firestore:indexes
   ```
3. Configure Upstash Redis for production rate limiting.
4. Configure QStash if you want durable feedback retries and signed worker delivery.
5. Run the production build:
   ```bash
   npm run build
   npm run start
   ```
6. Keep tests versioned in the repository, but deploy the built app output rather than raw source so production stays test-free.

---

## <img src="https://cdn.jsdelivr.net/npm/lucide-static/icons/shield.svg" alt="" width="18" /> Production Notes

### Async feedback generation

Feedback generation starts at `POST /api/feedback/process` and runs asynchronously in one of two modes.

**Mode 1: Upstash QStash**

When `QSTASH_TOKEN` is set, jobs are published to QStash and delivered to `POST /api/workers/feedback`.

| Feature                 | Detail                                                  |
| ----------------------- | ------------------------------------------------------- |
| Retry                   | 3 automatic retries with exponential backoff            |
| Dead-letter queue       | Failed jobs can be inspected in QStash                  |
| Deduplication           | One dedup key per interview                             |
| Signature verification  | Worker validates `upstash-signature` with QStash keys   |
| Observability           | QStash dashboard and message history                    |

**Mode 2: Next.js `after()` fallback**

When QStash is not configured, the app falls back to `after()` for local development and simple deployments. This path has no external retry queue.

**Execution flow**

```text
POST /api/feedback/process (client -> claims session)
  -> QStash path: publishFeedbackJob() -> Upstash QStash
     -> POST /api/workers/feedback -> runFeedbackGeneration() in lib/services/feedback-runner.ts
  -> Fallback path: after() -> runFeedbackGeneration()
```

**Required QStash environment variables**

| Variable                     | Description                 |
| ---------------------------- | --------------------------- |
| `QSTASH_TOKEN`               | QStash API token            |
| `QSTASH_CURRENT_SIGNING_KEY` | Current request signing key |
| `QSTASH_NEXT_SIGNING_KEY`    | Next rotating signing key   |

**Safety nets**

- 2-minute `AbortController` timeout in `lib/services/feedback-runner.ts`
- Exponential backoff retry inside `withRetry()`
- Status-polling recovery in `GET /api/feedback/status`

---

<a id="contributing"></a>

## <img src="https://cdn.jsdelivr.net/npm/lucide-static/icons/handshake.svg" alt="" width="18" /> Contributing

1. Create a focused branch for your change.
2. Run `npm run ci:check` before opening a PR.
3. Keep commits small and describe behavioral impact in the PR.

---

## <img src="https://cdn.jsdelivr.net/npm/lucide-static/icons/alert-circle.svg" alt="" width="18" /> Troubleshooting

- **Unauthorized route errors**
  - Check Firebase auth and session-cookie setup.

- **Feedback stuck in pending or processing**
  - Confirm `POST /api/feedback/process` is being called.
  - Check QStash configuration if the queue is enabled.

- **Microphone issues**
  - Use HTTPS or localhost.
  - Confirm browser microphone permission is granted.

- **Missing production env vars**
  - Startup checks will throw in production if required variables are missing.
