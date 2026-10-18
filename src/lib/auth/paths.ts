// Paths a signed-out visitor may open; middleware redirects everything else to `/`.
export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" || pathname === "/auth" || pathname.startsWith("/auth/")
  );
}
