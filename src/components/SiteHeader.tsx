import Link from "next/link";
import { LanguageToggle } from "./LanguageToggle";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-md items-center justify-between gap-4 px-5 py-4 md:max-w-3xl md:px-8 lg:max-w-6xl lg:px-10 lg:py-6">
      <Link
        href="/"
        className="tap-target flex items-center text-xl font-bold tracking-tight focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary lg:text-2xl"
      >
        Umra Hub
      </Link>
      <LanguageToggle />
    </header>
  );
}
