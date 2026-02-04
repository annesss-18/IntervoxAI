<div align="center">
  <img src="public/icon.png" alt="IntervoxAI Logo" width="80" height="80" />
  <h1>IntervoxAI</h1>
  <p><strong>Practice. Speak. Improve.</strong></p>
  <p><em>Real interviews. Real feedback. Faster growth.</em></p>
  
  <p>
    <a href="https://nextjs.org">
      <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js">
    </a>
    <a href="https://www.typescriptlang.org/">
      <img src="https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript" alt="TypeScript">
    </a>
    <a href="https://tailwindcss.com">
      <img src="https://img.shields.io/badge/Tailwind-4-cyan?style=flat-square&logo=tailwindcss" alt="Tailwind CSS">
    </a>
    <a href="https://firebase.google.com">
      <img src="https://img.shields.io/badge/Firebase-11-orange?style=flat-square&logo=firebase" alt="Firebase">
    </a>
  </p>
</div>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## ✨ Overview

**IntervoxAI** is an enterprise-grade mock interview platform powered by **Google Gemini AI**. It simulates realistic technical interviews, allowing users to practice verbal communication, receive real-time AI feedback, and improve their career readiness.

The platform is built for scalability and performance, featuring a robust Service/Repository architecture, server-side actions, and secure authentication flows.

## 🚀 Features

### Core Functionality

- **🎤 Voice-First Interface:** Speak naturally with real-time speech recognition.
- **🤖 AI-Generated Questions:** Dynamic questions tailored to specific roles (e.g., Senior React Developer) using Google Gemini.
- **📊 Deep Insight Analytics:** Personalized feedback on communication style, technical accuracy, and behavioral cues.
- **📝 Template Engine:** Create custom interview templates or use community-curated ones.

### Enterprise & Technical

- **🔐 Secure Authentication:** Firebase Auth with custom session management and security hardening.
- **💾 Scalable Architecture:** Firestore with optimized batching, caching, and repository pattern.
- **⚡ Performance First:** Upstash Redis rate limiting, Next.js partial prerendering, and edge-ready structure.
- **🎨 Design System:** Modern, accessible UI built with Tailwind CSS 4 and Shadcn components.

## 🛠 Tech Stack

- **Frontend:** Next.js 16 (App Router, Server Actions), React 19, Tailwind CSS v4
- **Backend Services:** Firebase Admin SDK, Firestore
- **AI Integration:** Google GenAI SDK (Gemini 1.5 Pro)
- **Infrastructure:** Vercel (Hosting), Upstash (Redis)
- **Quality Assurance:** ESLint, Prettier, Zod Validation

## 📦 Getting Started

### Prerequisites

- Node.js 18+
- Firebase Project (Auth & Firestore enabled)
- Google AI Studio API Key

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/intervoxai.git
   cd intervoxai
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure Environment**
   Copy `.env.example` to `.env.local` and populate the required keys:

   ```bash
   cp .env.example .env.local
   ```

   **Required Variables:**
   - `GOOGLE_GENERATIVE_AI_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_*` (Client Config)
   - `FIREBASE_ADMIN_*` (Service Account)
   - `UPSTASH_REDIS_*` (Rate Limiting)

4. **Run Development Server**
   ```bash
   npm run dev
   ```
   Access the app at `http://localhost:3000`.

## 📁 Project Structure

The project follows a Domain-Driven Design (DDD) inspired structure with Atomic Design for components:

```
intervoxai/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Authentication routes (sign-in, sign-up)
│   ├── (public)/           # Public landing page
│   ├── (root)/             # Protected app routes (dashboard, interview)
│   └── api/                # API routes (auth, interview, feedback)
├── components/             # Atomic Design Components
│   ├── atoms/              # Base UI (Button, Input, Card, Dialog)
│   ├── molecules/          # Composite (UserMenu, TechIcons, CompanyLogo)
│   ├── organisms/          # Feature (InterviewCard, AuthForm, LiveInterview)
│   ├── layout/             # Layout (Navbar, Footer, Container)
│   └── providers/          # Context (AuthProvider)
├── lib/                    # Business Logic Layer
│   ├── actions/            # Server Actions
│   ├── repositories/       # Data Access Layer (Firestore)
│   ├── services/           # Domain Services
│   └── hooks/              # Custom React Hooks
├── types/                  # TypeScript Definitions
├── constants/              # App Constants & Mappings
├── firebase/               # Firebase Configuration
└── public/                 # Static Assets
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

Please ensure all tests pass and your code adheres to the existing style guide.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <p><strong>IntervoxAI</strong></p>
  <p>Practice. Speak. Improve.</p>
</div>
