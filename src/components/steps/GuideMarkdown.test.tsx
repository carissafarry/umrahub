import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import id from "../../../messages/id.json";
import { parseMarkdown } from "@/lib/steps/markdown";
import { GuideMarkdown } from "./GuideMarkdown";

function render(markdown: string, locale: "id" | "en" = "id") {
  return renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "id" ? id : en}
      timeZone="Asia/Jakarta"
    >
      <GuideMarkdown blocks={parseMarkdown(markdown)} />
    </NextIntlClientProvider>,
  );
}

const seedId = `## Langkah-langkah

1. Cek masa berlaku paspor Anda.
2. Daftar antrean lewat aplikasi **M-Paspor** dan pilih kantor imigrasi terdekat.

## Yang perlu disiapkan

- KTP elektronik
- Kartu Keluarga (KK)

## Tips

- Informasi resmi: [imigrasi.go.id](https://www.imigrasi.go.id)
`;

const seedEn = `## Steps

1. Learn the pillars of Umrah:
   - **Ihram**: the intention to start, made at the **miqat**.
   - **Tawaf**: walking around the Ka'bah seven times.
2. Understand what is forbidden during ihram.

## What you need

- A trusted manasik guidebook

Official information: [nusuk.sa](https://www.nusuk.sa)
`;

describe("GuideMarkdown", () => {
  it("renders seed-style Indonesian content", () => {
    const html = render(seedId);
    expect(html).toMatch(/<h2[^>]*>Langkah-langkah<\/h2>/);
    expect(html.match(/<ol/g)).toHaveLength(1);
    expect(html.match(/<ul/g)).toHaveLength(2);
    expect(html).toMatch(/<ol class="[^"]*list-decimal[^"]*">(<li[^>]*>.*?<\/li>){2}<\/ol>/);
    expect(html).toContain('class="space-y-2 pl-6 list-disc ');
    expect(html).toContain("<strong");
    expect(html).toMatch(/<strong[^>]*>M-Paspor<\/strong>/);
    expect(html).toContain(
      '<a href="https://www.imigrasi.go.id" target="_blank" rel="noopener noreferrer"',
    );
    expect(html).toMatch(
      /imigrasi\.go\.id<span class="sr-only"> \(membuka tab baru\)<\/span><\/a>/,
    );
    expect(html).toContain("tap-target");
    expect(html).not.toContain("<h1");
  });

  it("renders seed-style English content with a nested list", () => {
    const html = render(seedEn, "en");
    expect(html).toMatch(/<h2[^>]*>Steps<\/h2>/);
    // The bullets sit inside the first ordered item.
    expect(html).toMatch(
      /<ol[^>]*><li[^>]*>Learn the pillars of Umrah:<ul[^>]*><li[^>]*><strong[^>]*>Ihram<\/strong>.*?<\/ul><\/li><li[^>]*>Understand/,
    );
    expect(html).toMatch(/<p>Official information: <a href="https:\/\/www\.nusuk\.sa"/);
    expect(html).toContain('<span class="sr-only"> (opens in a new tab)</span>');
    expect(html).not.toContain("<h1");
  });

  it("maps heading levels to h2 and h3", () => {
    const html = render("# Satu\n\n## Dua\n\n### Tiga\n\n#### Empat");
    expect(html).toMatch(/<h2[^>]*>Satu<\/h2>/);
    expect(html).toMatch(/<h2[^>]*>Dua<\/h2>/);
    expect(html).toMatch(/<h3[^>]*>Tiga<\/h3>/);
    expect(html).toMatch(/<h3[^>]*>Empat<\/h3>/);
    expect(html).not.toContain("<h1");
    expect(html).not.toMatch(/<h[4-6]/);
  });

  it("renders unsafe links as plain text", () => {
    for (const source of [
      "[x](javascript:alert(1))",
      "[x]( JavaScript:alert(1))",
      "[x](JAVASCRIPT:alert(1))",
      "[x](data:text/html,<b>)",
      "[x](http://example.com)",
      "[x](/steps/1)",
      "[x](mailto:a@b.c)",
      "[x](not a url)",
    ]) {
      const html = render(source);
      expect(html, source).toBe("<div class=\"flex flex-col gap-4 leading-relaxed\"><p>x</p></div>");
      expect(html, source).not.toContain("<a");
    }
  });

  it("escapes raw HTML", () => {
    const html = render(
      '<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n- <a href="javascript:alert(1)">klik</a>\n\n**<b>tebal</b>**',
    );
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("&lt;a href=&quot;javascript:alert(1)&quot;&gt;klik&lt;/a&gt;");
    expect(html).toMatch(/<strong[^>]*>&lt;b&gt;tebal&lt;\/b&gt;<\/strong>/);
    expect(html).not.toMatch(/<(script|img|b)[\s>]/);
    expect(html).not.toContain("<a");
  });

  it("escapes markup smuggled into link text and urls", () => {
    const html = render(
      '[<img src=x onerror=alert(1)>](https://example.com/"><script>) and [ok](https://example.com/a"b)',
    );
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain('href="https://example.com/&quot;&gt;&lt;script&gt;"');
    expect(html).toContain('href="https://example.com/a&quot;b"');
    expect(html).not.toMatch(/<(script|img)[\s>]/);
  });

  it("renders a very long line as one paragraph", () => {
    const long = "panjang ".repeat(20_000).trim();
    expect(render(long)).toBe(
      `<div class="flex flex-col gap-4 leading-relaxed"><p>${long}</p></div>`,
    );
  });
});
