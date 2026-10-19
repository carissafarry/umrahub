import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown, safeHref } from "./markdown";

const text = (value: string) => ({ type: "text", text: value });

describe("safeHref", () => {
  it("allows only absolute https URLs", () => {
    expect(safeHref("https://www.imigrasi.go.id")).toBe(
      "https://www.imigrasi.go.id",
    );
    expect(safeHref("HTTPS://nusuk.sa/x")).toBe("HTTPS://nusuk.sa/x");
    for (const url of [
      "http://example.com",
      "javascript:alert(1)",
      " JavaScript:alert(1)",
      "\tjavascript:alert(1)",
      "java\nscript:alert(1)",
      "data:text/html,<b>",
      "mailto:a@b.c",
      "/steps/1",
      "//evil.example",
      "https//missing-colon",
      "",
    ]) {
      expect(safeHref(url), url).toBeNull();
    }
  });
});

describe("parseInline", () => {
  it("parses bold and https links", () => {
    expect(
      parseInline("Daftar lewat **M-Paspor** di [imigrasi.go.id](https://www.imigrasi.go.id)."),
    ).toEqual([
      text("Daftar lewat "),
      { type: "strong", children: [text("M-Paspor")] },
      text(" di "),
      { type: "link", href: "https://www.imigrasi.go.id", text: "imigrasi.go.id" },
      text("."),
    ]);
  });

  it("keeps only the text of non-https links", () => {
    expect(parseInline("[x](javascript:alert(1)) end")).toEqual([text("x end")]);
    expect(parseInline("[x]( JavaScript:alert(1))")).toEqual([text("x")]);
    expect(parseInline("[x](data:text/html,<b>)")).toEqual([text("x")]);
    expect(parseInline("[x](http://example.com)")).toEqual([text("x")]);
    expect(parseInline("[x](/steps/1)")).toEqual([text("x")]);
  });

  it("allows links inside bold but not bold inside bold", () => {
    expect(parseInline("**lihat [nusuk](https://nusuk.sa)**")).toEqual([
      {
        type: "strong",
        children: [
          text("lihat "),
          { type: "link", href: "https://nusuk.sa", text: "nusuk" },
        ],
      },
    ]);
  });

  it("leaves unmatched markup as literal text", () => {
    expect(parseInline("**tidak ditutup")).toEqual([text("**tidak ditutup")]);
    expect(parseInline("****")).toEqual([text("****")]);
    expect(parseInline("[tanpa url] dan [](https://x.y)")).toEqual([
      text("[tanpa url] dan [](https://x.y)"),
    ]);
    expect(parseInline("<script>alert(1)</script>")).toEqual([
      text("<script>alert(1)</script>"),
    ]);
  });

  it("stays fast on long hostile lines", () => {
    const hostile = "[a](".repeat(20_000) + "**" + "[".repeat(50_000);
    const started = performance.now();
    expect(parseInline(hostile)).toEqual([text(hostile)]);
    expect(parseMarkdown("x".repeat(1_000_000))).toEqual([
      { type: "paragraph", content: [text("x".repeat(1_000_000))] },
    ]);
    expect(performance.now() - started).toBeLessThan(2000);
  });
});

describe("parseMarkdown", () => {
  it("parses seed-style Indonesian content", () => {
    const blocks = parseMarkdown(
      [
        "## Langkah-langkah",
        "",
        "1. Cek masa berlaku paspor.",
        "2. Daftar lewat **M-Paspor**.",
        "",
        "## Yang perlu disiapkan",
        "",
        "- KTP elektronik",
        "- Kartu Keluarga (KK)",
        "",
        "Paragraf satu",
        "baris dua.",
      ].join("\n"),
    );
    expect(blocks).toEqual([
      { type: "heading", level: 2, content: [text("Langkah-langkah")] },
      {
        type: "list",
        ordered: true,
        items: [
          { content: [text("Cek masa berlaku paspor.")], lists: [] },
          {
            content: [
              text("Daftar lewat "),
              { type: "strong", children: [text("M-Paspor")] },
              text("."),
            ],
            lists: [],
          },
        ],
      },
      { type: "heading", level: 2, content: [text("Yang perlu disiapkan")] },
      {
        type: "list",
        ordered: false,
        items: [
          { content: [text("KTP elektronik")], lists: [] },
          { content: [text("Kartu Keluarga (KK)")], lists: [] },
        ],
      },
      { type: "paragraph", content: [text("Paragraf satu baris dua.")] },
    ]);
  });

  it("maps heading levels to h2 and h3 only", () => {
    expect(parseMarkdown("# a\n## b\n### c\n###### d").map((b) => b.type === "heading" && b.level)).toEqual([2, 2, 3, 3]);
    expect(parseMarkdown("####### seven")).toEqual([
      { type: "paragraph", content: [text("####### seven")] },
    ]);
  });

  it("nests 3-space-indented bullets under an ordered item (step 13 shape)", () => {
    const blocks = parseMarkdown(
      [
        "## Steps",
        "",
        "1. Learn the pillars of Umrah:",
        "   - **Ihram**: intention",
        "   - **Tawaf**: seven circuits",
        "2. Understand the ihram rules.",
      ].join("\r\n"),
    );
    expect(blocks).toHaveLength(2);
    const list = blocks[1];
    expect(list.type === "list" && list.ordered).toBe(true);
    if (list.type !== "list") return;
    expect(list.items).toHaveLength(2);
    expect(list.items[0].lists).toHaveLength(1);
    expect(list.items[0].lists[0].ordered).toBe(false);
    expect(list.items[0].lists[0].items).toHaveLength(2);
    expect(list.items[0].lists[0].items[1].content[0]).toEqual({
      type: "strong",
      children: [text("Tawaf")],
    });
    expect(list.items[1].lists).toEqual([]);
  });

  it("joins continuation lines into the open list item", () => {
    expect(parseMarkdown("- satu\n  lanjut\n* dua")).toEqual([
      {
        type: "list",
        ordered: false,
        items: [
          { content: [text("satu lanjut")], lists: [] },
          { content: [text("dua")], lists: [] },
        ],
      },
    ]);
  });

  it("treats an indented bullet without a parent list as a top-level item", () => {
    expect(parseMarkdown("   - lonely")).toEqual([
      {
        type: "list",
        ordered: false,
        items: [{ content: [text("lonely")], lists: [] }],
      },
    ]);
  });

  it("keeps raw HTML and unsupported syntax as text", () => {
    expect(
      parseMarkdown("<script>alert(1)</script>\n\n> quote\n\n```js\ncode\n```"),
    ).toEqual([
      { type: "paragraph", content: [text("<script>alert(1)</script>")] },
      { type: "paragraph", content: [text("> quote")] },
      { type: "paragraph", content: [text("```js code ```")] },
    ]);
  });

  it("returns no blocks for empty input", () => {
    expect(parseMarkdown("")).toEqual([]);
    expect(parseMarkdown("\n  \n")).toEqual([]);
  });
});
