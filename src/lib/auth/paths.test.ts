import { describe, expect, it } from "vitest";
import { isPublicPath } from "./paths";

describe("isPublicPath", () => {
  it.each(["/", "/auth", "/auth/callback"])("%s is public", (pathname) => {
    expect(isPublicPath(pathname)).toBe(true);
  });

  it.each(["/dashboard", "/trips/abc", "/authx", "/au"])(
    "%s is not public",
    (pathname) => {
      expect(isPublicPath(pathname)).toBe(false);
    },
  );
});
