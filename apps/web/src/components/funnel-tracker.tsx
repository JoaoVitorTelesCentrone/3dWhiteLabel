"use client";

import { useEffect } from "react";

type FunnelEvent = "lp_view" | "cta_click" | "form_start" | "form_submit";

export function trackFunnelEvent(eventName: FunnelEvent) {
  if (typeof window === "undefined") return;
  const query = new URLSearchParams(window.location.search);
  void fetch("/api/marketing-event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      eventName,
      pagePath: window.location.pathname,
      utmSource: query.get("utm_source"),
      utmMedium: query.get("utm_medium"),
      utmCampaign: query.get("utm_campaign"),
    }),
  }).catch(() => undefined);
}

export function FunnelTracker() {
  useEffect(() => {
    trackFunnelEvent("lp_view");
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>('a[href="/contato"], a[href^="/contato?"]');
      if (!link) return;
      trackFunnelEvent("cta_click");
      const query = new URLSearchParams(window.location.search);
      const campaign = new URLSearchParams();
      for (const key of ["utm_source", "utm_medium", "utm_campaign"] as const) {
        const value = query.get(key);
        if (value) campaign.set(key, value.slice(0, 100));
      }
      if (campaign.size) link.href = `/contato?${campaign.toString()}`;
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
