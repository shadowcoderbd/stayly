import { describe, expect, it } from "vitest";
import { auth } from "@/server/lib/better-auth";

// vitest.config.ts sets fake Google credentials, so the provider is registered.
describe("Google sign-in (provider configured)", () => {
  it("starts the OAuth flow with a Google authorization URL pointing back at our callback", async () => {
    const res = await auth.api.signInSocial({
      body: { provider: "google", callbackURL: "/auth/continue", errorCallbackURL: "/login" },
    });
    expect(res.url).toBeDefined();
    const url = new URL(res.url!);
    expect(url.hostname).toBe("accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("test-google-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:3000/api/auth/callback/google");
    expect(url.searchParams.get("prompt")).toBe("select_account");
  });

  it("rejects providers that aren't configured", async () => {
    await expect(auth.api.signInSocial({ body: { provider: "github", callbackURL: "/" } })).rejects.toThrow();
  });
});
