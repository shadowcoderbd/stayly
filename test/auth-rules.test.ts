import { describe, expect, it } from "vitest";
import { googleErrorMessage, landingPath } from "@/features/auth";

describe("landingPath", () => {
  it("honors a safe same-site redirectTo for any role", () => {
    expect(landingPath("user", "/bookings")).toBe("/bookings");
    expect(landingPath("admin", "/hotels/harbor-house?checkIn=2030-01-01")).toBe("/hotels/harbor-house?checkIn=2030-01-01");
  });

  it("ignores unsafe targets and falls back to the role's home", () => {
    expect(landingPath("user", "//evil.example")).toBe("/");
    expect(landingPath("user", "/\\evil.example")).toBe("/");
    expect(landingPath("admin", "https://evil.example")).toBe("/admin/bookings");
  });

  it("defaults admins to the admin area and everyone else to /", () => {
    expect(landingPath("admin")).toBe("/admin/bookings");
    expect(landingPath("user", "")).toBe("/");
    expect(landingPath(null, null)).toBe("/");
  });
});

describe("googleErrorMessage", () => {
  it("maps the codes Better Auth sends", () => {
    expect(googleErrorMessage("account_not_linked")).toBe("This email already has a Stayly account. Sign in with your password.");
    expect(googleErrorMessage("BANNED_USER")).toBe("This account is suspended.");
  });

  it("falls back to a generic message for unknown codes and returns null without one", () => {
    expect(googleErrorMessage("access_denied")).toBe("Google sign-in was cancelled or failed. Please try again.");
    expect(googleErrorMessage(null)).toBeNull();
  });
});
