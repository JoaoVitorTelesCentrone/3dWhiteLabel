export function resolveTenantHost(value: string): string {
  const host = value.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");

  if (
    process.env.NODE_ENV === "development" &&
    process.env.AGENCIA3D_LOCAL_DEMO_AUTO_LOGIN === "true" &&
    (host === "localhost" || host === "127.0.0.1")
  ) {
    return "demo.localhost";
  }

  return host;
}

export function resolveRequestHost(requestHeaders: Pick<Headers, "get">): string | null {
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",", 1)[0]?.trim();
  const host = forwardedHost ?? requestHeaders.get("host")?.trim();
  const origin = requestHeaders.get("origin");
  if (origin && (!host || /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host))) {
    try {
      const originHost = new URL(origin).host;
      if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(originHost)) return resolveTenantHost(originHost);
    } catch {
      // Ignore invalid Origin values and use the request host.
    }
  }
  return host ? resolveTenantHost(host) : null;
}

export function canUseSelectedTenantFallback(host: string | null): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "demo.localhost";
}
