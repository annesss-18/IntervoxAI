# Contributing to IntervoxAI

Thank you for your interest in contributing to IntervoxAI! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project (for full functionality)
- Google AI Studio API key

### Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/intervoxai.git
   cd intervoxai
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```
5. Start development server:
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names:

- `feature/add-voice-feedback`
- `fix/auth-session-timeout`
- `docs/update-api-reference`
- `refactor/interview-service`

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]
[optional footer]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting (no code change)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**

```
feat(interview): add real-time voice transcription
fix(auth): resolve session expiry on tab switch
docs(readme): update installation instructions
```

### Code Style

- **TypeScript**: Use strict typing, avoid `any`
- **Components**: Follow Atomic Design (atoms → molecules → organisms)
- **Styling**: Use Tailwind CSS classes
- **Imports**: Use `@/` path aliases
- **Logging**: Use `lib/logger.ts` instead of `console.log`

### Before Submitting

Run these checks:

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build verification
npm run build
```

## Pull Request Process

1. **Create a PR** against the `main` branch
2. **Fill out the PR template** completely
3. **Ensure CI passes** (lint, type-check, build)
4. **Request review** from maintainers
5. **Address feedback** promptly
6. **Squash commits** if requested

### PR Title Format

```
type(scope): description
```

Example: `feat(live-interview): add waveform visualizer`

## Architecture Guidelines

### Component Structure

```
components/
├── atoms/        # Base UI (Button, Input, Card)
├── molecules/    # Composite (UserMenu, TechIcons)
├── organisms/    # Feature (InterviewCard, LiveInterview)
├── layout/       # Layout (Navbar, Footer)
└── providers/    # Context (AuthProvider)
```

### Service Layer

```
lib/
├── actions/      # Server Actions (thin controllers)
├── services/     # Business logic
├── repositories/ # Data access (Firestore)
└── hooks/        # React hooks
```

### API Routes

- Use `app/api/` for REST endpoints
- Apply middleware for auth and rate limiting
- Validate all inputs with Zod

## Testing

Currently, the project relies on:

- TypeScript type checking
- ESLint for code quality
- Manual testing

Contributions to add automated tests are welcome!

## Questions?

- Open a [GitHub Discussion](https://github.com/YOUR_USERNAME/intervoxai/discussions)
- Check existing [Issues](https://github.com/YOUR_USERNAME/intervoxai/issues)

---

Thank you for contributing to IntervoxAI! 🚀
