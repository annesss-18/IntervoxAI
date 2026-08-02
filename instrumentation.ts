// Dynamically import Node-only validation to keep Edge bundles clean.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertValidEnv } = await import("@/lib/env");
    assertValidEnv();
  }
}
