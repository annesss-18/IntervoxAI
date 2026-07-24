// Next.js calls register() once when a new server instance starts, and
// waits for it to complete before accepting requests. Stable since Next.js
// 15 — no experimental.instrumentationHook config needed. See:
// https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
//
// register() can run in both the Node.js and Edge runtimes (proxy.ts runs
// on Edge). Environment validation needs Node-only APIs (lib/resume-crypto
// uses node:crypto) and Edge doesn't need these checks anyway, so this is
// gated to the Node runtime. The import is deliberately dynamic and inside
// the guard, not hoisted to the top of the file, so bundling for the Edge
// runtime doesn't pull in Node-only modules.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertValidEnv } = await import("@/lib/env");
    assertValidEnv();
  }
}
