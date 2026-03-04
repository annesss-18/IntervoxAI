# Integration Testing Guide

This document outlines the critical lifecycle paths that need integration test coverage. No test framework is currently set up — this serves as a roadmap for future test implementation.

## Critical Lifecycle Paths

### 1. Full Interview Lifecycle

```
Create Session → Live Token Issuance → WebSocket Connect →
Audio Send/Receive → Transcript Queue → End Interview →
Submit Feedback → Process → Status Recovery
```

**Key assertions:**
- Session transitions through `active` → `completed` statuses
- Only one WebSocket connection is active at any time (singleflight)
- Transcript includes both user and model entries
- Feedback processing completes within timeout window
- `feedbackStatus` transitions: `pending` → `processing` → `completed`

### 2. Connection Resilience

```
Connect → Unexpected Disconnect → Auto-Reconnect (exp. backoff) →
Re-establish Session → Resume Audio
```

**Key assertions:**
- Reconnection attempts follow exponential backoff (1s, 2s, 4s, 8s, 16s)
- Maximum 5 reconnection attempts before error state
- Intentional disconnect does not trigger reconnection
- Duplicate connections are prevented by singleflight guard

### 3. Feedback Timeout Recovery

```
Submit Feedback → Processing Starts → 5 min Timeout →
Auto-Recovery to Failed → User Retry → Reprocess
```

**Key assertions:**
- Stuck `processing` state auto-recovers to `failed` after 5 minutes
- Timeout error message reaches the client (via `error` field, not `feedbackError`)
- Retry re-triggers processing and resets status to `pending`

### 4. Transcript Final-Flush

```
User Speaking → Click End Interview → flushPendingTranscript →
Trailing Partial Captured → Submit with Complete Transcript
```

**Key assertions:**
- `userTranscriptRef` is flushed into transcript array before submission
- 1.5s debounce timeout is cleared immediately
- Submitted transcript includes the trailing partial

### 5. Audio Resource Cleanup

```
Speaker Test → Retry → Retry → Retry →
All Prior AudioContexts Closed → No Leaked Contexts
```

**Key assertions:**
- Each retry closes the previous `AudioContext` before creating a new one
- Browser AudioContext limit is never reached
- Unmount cleanup closes all remaining contexts

## Recommended Test Stack

- **Framework:** Vitest (fast, ESM-native, works well with Next.js)
- **Browser testing:** Playwright (for end-to-end lifecycle tests)
- **API mocking:** MSW (Mock Service Worker) for intercepting fetch calls
- **WebSocket mocking:** `vitest-websocket-mock` or similar for Live API simulation
