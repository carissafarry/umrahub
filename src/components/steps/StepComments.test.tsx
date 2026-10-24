import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import id from "../../../messages/id.json";
import type { StepComment } from "@/lib/steps/comments";
import { StepComments } from "./StepComments";

vi.mock("@/lib/steps/actions", () => ({
  postStepComment: vi.fn(),
  deleteStepComment: vi.fn(),
}));

const stepId = "5eed0000-0000-4000-8000-000000000001";

const own: StepComment = {
  id: "cccccccc-0000-4000-8000-000000000003",
  authorName: "Aisyah Rahman",
  authorAvatarUrl: "https://lh3.googleusercontent.com/a/aisyah",
  content: "Bawa fotokopi paspor.\nSimpan di map.",
  createdAt: "2026-10-22T08:00:00+00:00",
  isOwn: true,
};
const other: StepComment = {
  id: "cccccccc-0000-4000-8000-000000000002",
  authorName: "Budi",
  authorAvatarUrl: null,
  content: "Datang pagi.",
  createdAt: "2026-10-21T08:00:00+00:00",
  isOwn: false,
};
const nameless: StepComment = {
  id: "cccccccc-0000-4000-8000-000000000001",
  authorName: "",
  authorAvatarUrl: null,
  content: "Tanpa nama.",
  createdAt: "2026-10-20T08:00:00+00:00",
  isOwn: false,
};

function render(comments: StepComment[], locale: "id" | "en" = "id") {
  return renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "id" ? id : en}
      timeZone="Asia/Jakarta"
    >
      <StepComments stepId={stepId} comments={comments} />
    </NextIntlClientProvider>,
  );
}

describe("StepComments", () => {
  it("renders the heading, note, form and the single indigo CTA", () => {
    const html = render([]);
    expect(html).toMatch(/^<section[^>]*>/);
    expect(html).toMatch(/<h2[^>]*>Tips dari jemaah<\/h2>/);
    expect(html).toContain("semua pengguna Umra Hub yang sudah masuk");
    expect(html).toMatch(/<label for="([^"]+)"[^>]*>Bagikan tips Anda<\/label>/);
    const label = html.match(/<label for="([^"]+)"/)?.[1];
    expect(html).toMatch(new RegExp(`<textarea[^>]*id="${label}"[^>]*maxLength="1000"`));
    expect(html).toContain("0/1000 karakter");
    expect(html).toMatch(/<button type="submit"[^>]*>Kirim tips/);
    expect(html.match(/bg-primary(?![\w-])/g)).toHaveLength(1);
    expect(html).toContain('aria-live="polite"');
  });

  it("shows the empty state without a list", () => {
    const html = render([]);
    expect(html).toContain("Belum ada tips. Jadilah yang pertama berbagi.");
    expect(html).not.toContain("<ul");
  });

  it("lists comments in the given order with avatar or fallback", () => {
    const html = render([own, other, nameless]);
    expect(html).not.toContain("Belum ada tips");
    const order = ["Aisyah Rahman", "Budi", "Jemaah Umra Hub"].map((name) =>
      html.indexOf(`>${name}</span>`),
    );
    expect(order.every((index) => index > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);

    expect(html).toContain(
      '<img src="https://lh3.googleusercontent.com/a/aisyah" alt="" referrerPolicy="no-referrer" width="40" height="40"',
    );
    expect(html.match(/<img /g)).toHaveLength(1);
    expect(html).toMatch(/<span aria-hidden="true"[^>]*bg-tile-violet[^>]*>B<\/span>/);
    expect(html).toMatch(/<span aria-hidden="true"[^>]*bg-tile-violet[^>]*>J<\/span>/);
    expect(html).toContain('<time dateTime="2026-10-22T08:00:00+00:00"');
    expect(html).toContain("22 Okt 2026");
    expect(html).toMatch(
      /<p class="whitespace-pre-line break-words">Bawa fotokopi paspor.\nSimpan di map.<\/p>/,
    );
  });

  it("shows the delete control only on the user's own comments", () => {
    const html = render([own, other, nameless]);
    expect(html.match(/aria-label="Hapus tips"/g)).toHaveLength(1);
    expect(html.match(/role="alertdialog"/g)).toHaveLength(1);
    expect(html).toContain(
      '<button type="button" aria-label="Hapus tips" class="tap-target',
    );
    // The destructive confirm is ink-filled, never indigo.
    expect(html).toMatch(/bg-foreground text-background[^"]*">.*?Hapus<\/button>/);
    expect(render([other]).match(/Hapus tips/g)).toBeNull();
  });

  it("renders HTML and links in content as plain text", () => {
    const html = render([
      { ...other, content: '<b>hi</b> <script>alert(1)</script> https://example.com' },
    ]);
    expect(html).toContain(
      "&lt;b&gt;hi&lt;/b&gt; &lt;script&gt;alert(1)&lt;/script&gt; https://example.com",
    );
    expect(html).not.toContain("<b>");
    expect(html).not.toContain("<script");
    expect(html).not.toContain('href="https://example.com"');
  });

  it("renders English copy with the en locale", () => {
    const html = render([own, nameless], "en");
    expect(html).toMatch(/<h2[^>]*>Tips from pilgrims<\/h2>/);
    expect(html).toContain("Share your tip");
    expect(html).toContain("0/1000 characters");
    expect(html).toContain("Post tip");
    expect(html).toContain('aria-label="Delete tip"');
    expect(html).toContain(">Umra Hub pilgrim</span>");
    expect(html).toContain("Oct 22, 2026");
    expect(html).not.toContain("Tips dari");
    expect(render([], "en")).toContain("No tips yet. Be the first to share one.");
  });
});
