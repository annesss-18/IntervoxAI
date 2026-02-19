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
    <a href="#-features">Features</a> &bull;
    <a href="#-tech-stack">Tech Stack</a> &bull;
    <a href="#-getting-started">Getting Started</a> &bull;
    <a href="#-deployment">Deployment</a> &bull;
    <a href="#-contributing">Contributing</a>
  </p>
</div>

---

## :sparkles: Overview

**IntervoxAI** is an AI-powered mock interview platform built for realistic, voice-first technical interview practice.

It combines:

- Live conversational interview simulation (Gemini Live API)
- Job-description-driven interview template generation
- Resume-aware context personalization
- Structured post-interview feedback with scoring and coaching

The application follows a clean layered architecture (UI -> API routes -> services -> repositories -> Firestore), with strong runtime guards for auth, rate limits, and secure data handling.

---

## :rocket: Features

### Core product capabilities

- **Authentication**
  - Firebase Auth (email/password + Google)
  - Secure server-side session cookies

- **Template studio**
  - Analyze JD from text, URL, or file
  - Extract role, company, level, type, and stack
  - Generate interview questions and interviewer persona

- **Live voice interviews**
  - Real-time microphone streaming to Gemini Live
  - AI audio playback, captions, and session controls
  - Session lifecycle handling and reconnect behavior

- **Feedback engine**
  - Transcript queueing and async processing
  - Category scoring, strengths, gaps, and final assessment
  - Idempotent feedback docs per user/session

### Platform hardening

- Auth middleware for protected routes
- Route-level rate limiting (Upstash Redis in production)
- SSRF-safe URL scraping for JD extraction
- Resume encryption at rest (AES-256-GCM)
- CSP and security headers in Next.js config

---

## :toolbox: Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| UI System | Radix UI, shadcn-style atomic components |
| Validation | Zod, React Hook Form |
| AI | `@google/genai`, `@ai-sdk/google`, `ai` |
| Data | Firestore + Firebase Admin SDK |
| Auth | Firebase Auth + server session cookies |
| Rate limiting | Upstash Redis + `@upstash/ratelimit` |
| Parsing | `unpdf`, `mammoth`, `cheerio` |

---

## :building_construction: Architecture

```text
Client (Next.js App Router UI)
  -> API Routes (/app/api/*)
    -> Service Layer (/lib/services)
      -> Repository Layer (/lib/repositories)
        -> Firestore (users, interview_templates, interview_sessions, feedback)
```

### Real-time interview flow

```text
Mic Input -> useAudioCapture -> /api/live/token -> Gemini Live WebSocket
Gemini audio/text -> useAudioPlayback + live transcript state
Interview end -> /api/feedback -> /api/feedback/process -> feedback document
```

---

## :file_folder: Project Structure

```text
app/
  (public)/                  Marketing + docs/legal/support
  (auth)/                    Sign-in / sign-up
  (root)/                    Dashboard, create, explore, live interview
  api/                       Route handlers
components/
  atoms/                     UI primitives
  molecules/                 Reusable composite elements
  organisms/                 Feature-level components
  layout/                    Navbar, Footer, Container
  providers/                 Auth provider
firebase/
  client.ts                  Firebase client initialization
  admin.ts                   Firebase admin initialization
lib/
  actions/                   Server actions
  services/                  Business orchestration
  repositories/              Firestore access
  hooks/                     Audio/live interview hooks
  api-middleware.ts          Auth/rate-limit wrappers
  server-utils.ts            Secure file/URL extraction
  resume-crypto.ts           Resume encryption/decryption
types/                       Shared TypeScript contracts
constants/                   Schemas and mappings
firestore.rules              Firestore security rules
firestore.indexes.json       Firestore indexes
```

---

## :arrows_clockwise: Core Workflows

### 1. Template generation

1. User submits JD input in `CreateInterviewForm`.
2. `POST /api/interview/analyze` extracts structured role context.
3. User confirms edits (role/stack/level/type/visibility).
4. `POST /api/interview/generate` creates and stores template.

### 2. Session creation + live interview

1. `POST /api/interview/session/create` creates a session from template.
2. `LiveInterviewAgent` requests ephemeral token from `POST /api/live/token`.
3. Browser streams PCM audio to Gemini Live and receives AI audio/text.
4. Transcript is collected for feedback generation.

### 3. Feedback processing

1. `POST /api/feedback` queues transcript and marks session ready.
2. `POST /api/feedback/process` claims and starts async feedback generation.
3. `GET /api/feedback/status` polls until completed/failed.
4. Results are written to `feedback` and attached to session metadata.

---

## :satellite: API Summary

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/live/token` | `POST` | Yes | Create Gemini ephemeral token for live interview |
| `/api/resume/parse` | `POST` | Yes | Parse uploaded PDF resume |
| `/api/feedback` | `POST` | Yes | Queue transcript for feedback |
| `/api/feedback/status` | `GET` | Yes | Retrieve feedback processing state |
| `/api/feedback/process` | `POST` | Yes | Start async feedback generation |
| `/api/interview/analyze` | `POST` | Yes | Extract role context from JD |
| `/api/interview/generate` | `POST` | Yes | Generate full interview template |
| `/api/interview/template/create` | `POST` | Yes | Direct template creation |
| `/api/interview/session/create` | `POST` | Yes | Create interview session |
| `/api/interview/session/[sessionId]` | `GET`,`PATCH` | Yes | Read/update session |
| `/api/interview/upload-resume` | `POST` | Yes | Parse + attach resume to session |
| `/api/interview/draft` | `POST` | Yes | Generate draft template response |
| `/api/auth/signout` | `POST` | No (rate-limited) | Clear server session cookie |

---

## :card_file_box: Data Model (Firestore)

### Collections

- `users`
  - User profile keyed by Firebase UID

- `interview_templates`
  - Role/company metadata
  - Generated base questions, system instruction, persona
  - Visibility and usage stats

- `interview_sessions`
  - Session status (`setup`, `active`, `completed`)
  - Optional transcript and encrypted resume text
  - Feedback processing metadata

- `feedback`
  - Deterministic ID: `${userId}_${interviewId}`
  - Category scores and coaching outputs

### Rules and indexes

- Security rules: `firestore.rules`
- Composite indexes: `firestore.indexes.json`

---

## :shield: Security and Privacy

- **AuthZ checks**: session/template ownership is validated before reads/writes.
- **CSRF mitigation**: mutation routes enforce expected `Content-Type`.
- **Rate limiting**: Redis-backed in production; in-memory fallback for local dev.
- **SSRF defense**: hostname/IP validation, blocked private ranges, DNS rebinding checks.
- **Sensitive data**: resumes support AES-256-GCM encryption (`RESUME_ENCRYPTION_KEY`).
- **Headers**: CSP and defensive security headers configured in `next.config.mjs`.

---

## :hammer_and_wrench: Getting Started

### Prerequisites

- Node.js `>= 18`
- npm
- Firebase project (Auth + Firestore)
- Gemini API key
- Upstash Redis (required for production rate limiting)

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

## :lock: Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase client SDK config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Firebase client SDK config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase client SDK config |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | Firebase client SDK config |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase client SDK config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Firebase client SDK config |
| `FIREBASE_PROJECT_ID` | Yes (runtime) | Firebase Admin SDK |
| `FIREBASE_CLIENT_EMAIL` | Yes (runtime) | Firebase Admin SDK |
| `FIREBASE_PRIVATE_KEY` | Yes (runtime) | Firebase Admin SDK private key (`\n` escaped) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | Gemini API key |
| `RESUME_ENCRYPTION_KEY` | Recommended | Required in prod for encrypted resume storage |
| `UPSTASH_REDIS_REST_URL` | Prod | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Prod | Upstash Redis token |
| `NEXT_PUBLIC_BRANDFETCH_CLIENT_ID` | Optional | Better company logo rendering |
| `NEXT_PUBLIC_APP_URL` | Recommended | Canonical app URL for metadata |

---

## :scroll: Available Scripts

| Script | Command | Purpose |
|---|---|---|
| Dev | `npm run dev` | Start Next.js dev server (Turbopack) |
| Dev (webpack) | `npm run dev:webpack` | Start dev server with webpack |
| Build | `npm run build` | Create production build |
| Start | `npm run start` | Run production build |
| Lint | `npm run lint` | Run ESLint |
| Lint fix | `npm run lint:fix` | Auto-fix lint issues |
| Type check | `npm run type-check` | Run TypeScript checks |
| CI check | `npm run ci:check` | Style guard + lint + types + build |

---

## :ship: Deployment

1. Set all required env vars on your hosting platform.
2. Deploy Firestore rules and indexes:
   - `firestore.rules`
   - `firestore.indexes.json`
3. Ensure Upstash Redis is configured for production rate limiting.
4. Verify Firebase Admin credentials are available at runtime.

---

## :handshake: Contributing

Contributions are welcome. For meaningful changes:

1. Fork and create a feature branch.
2. Run `npm run ci:check` before opening a PR.
3. Keep commits focused and include context in PR description.

---

## :fire_extinguisher: Troubleshooting

- **Unauthorized route errors**
  - Check Firebase auth/session cookie setup.
- **Feedback stuck in pending/processing**
  - Validate Gemini key and server logs.
- **Resume parsing fails**
  - Ensure PDF and file size under 5MB for `/api/resume/parse`.
- **Live connection instability**
  - Verify microphone permission and network quality.
- **Rate-limit issues in prod**
  - Confirm Upstash env vars are present and valid.
