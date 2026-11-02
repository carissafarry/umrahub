import type { Metadata } from "next";
import { Noto_Naskh_Arabic, Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const notoNaskhArabic = Noto_Naskh_Arabic({
  variable: "--font-naskh-arabic",
  subsets: ["arabic"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${plusJakartaSans.variable} ${notoNaskhArabic.variable}`}
    >
      <body className="flex min-h-screen flex-col antialiased">
        <NextIntlClientProvider>
          <SiteHeader />
          {children}
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
