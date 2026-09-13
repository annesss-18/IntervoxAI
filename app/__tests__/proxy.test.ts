import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

describe("proxy", () => {
  it("does not apply application CSP to Firebase Auth helper routes", () => {
    const response = proxy(
      new NextRequest("https://intervoxai.example/__/auth/iframe"),
    );

    expect(response.headers.get("Content-Security-Policy")).toBeNull();
  });

  it("continues to apply CSP to application routes", () => {
    const response = proxy(
      new NextRequest("https://intervoxai.example/sign-in"),
    );

    expect(response.headers.get("Content-Security-Policy")).toContain(
      "frame-ancestors 'none'",
    );
  });
});
