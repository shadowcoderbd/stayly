import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/server/config/env";

const base = {
  DATABASE_URL: "postgres://u:p@localhost:5432/db",
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
};

describe("server env: Google sign-in config", () => {
  it("is disabled when neither credential is set (or both are empty)", () => {
    expect(parseServerEnv(base).google).toBeNull();
    expect(parseServerEnv({ ...base, GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: " " }).google).toBeNull();
  });

  it("is enabled when both are set", () => {
    expect(parseServerEnv({ ...base, GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" }).google).toEqual({
      clientId: "id",
      clientSecret: "secret",
    });
  });

  it("refuses to start with only one of them, naming the missing variable", () => {
    expect(() => parseServerEnv({ ...base, GOOGLE_CLIENT_ID: "id" })).toThrow(/GOOGLE_CLIENT_SECRET is required/);
    expect(() => parseServerEnv({ ...base, GOOGLE_CLIENT_SECRET: "secret" })).toThrow(/GOOGLE_CLIENT_ID is required/);
  });
});
