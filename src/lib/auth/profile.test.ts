import { describe, expect, it } from "vitest";
import { getUserProfile } from "./profile";

const email = "jemaah@example.com";

describe("getUserProfile", () => {
  it("uses full_name and avatar_url", () => {
    expect(
      getUserProfile({
        email,
        user_metadata: {
          full_name: "Siti Aminah",
          name: "Siti",
          avatar_url: "https://example.com/a.png",
          picture: "https://example.com/p.png",
        },
      }),
    ).toEqual({ name: "Siti Aminah", avatarUrl: "https://example.com/a.png" });
  });

  it("falls back to name and picture", () => {
    expect(
      getUserProfile({
        email,
        user_metadata: { name: "Siti", picture: "https://example.com/p.png" },
      }),
    ).toEqual({ name: "Siti", avatarUrl: "https://example.com/p.png" });
  });

  it("falls back to email and no avatar", () => {
    expect(getUserProfile({ email, user_metadata: {} })).toEqual({
      name: email,
      avatarUrl: null,
    });
  });
});
