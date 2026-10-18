import { describe, expect, it } from "vitest";
import { getRequestOrigin } from "./origin";

describe("getRequestOrigin", () => {
  it("prefers the origin header", () => {
    expect(
      getRequestOrigin(
        new Headers({
          origin: "http://localhost:3000",
          host: "example.com",
        }),
      ),
    ).toBe("http://localhost:3000");
  });

  it("falls back to forwarded proto and host", () => {
    expect(
      getRequestOrigin(
        new Headers({
          "x-forwarded-proto": "https",
          "x-forwarded-host": "umrahub.vercel.app",
          host: "internal:3000",
        }),
      ),
    ).toBe("https://umrahub.vercel.app");
  });

  it("falls back to the host header", () => {
    expect(
      getRequestOrigin(
        new Headers({ "x-forwarded-proto": "http", host: "localhost:3000" }),
      ),
    ).toBe("http://localhost:3000");
  });
});
