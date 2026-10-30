import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const eventSchema = z.object({
  eventName: z.enum(["lp_view", "cta_click", "form_start", "form_submit"]),
  pagePath: z.string().regex(/^\/(?:[a-z0-9-]+\/?)*$/i).max(200),
  utmSource: z.string().max(300).optional().nullable().transform(cleanCampaign),
  utmMedium: z.string().max(300).optional().nullable().transform(cleanCampaign),
  utmCampaign: z.string().max(300).optional().nullable().transform(cleanCampaign),
});

function cleanCampaign(value: string | null | undefined) {
  return value?.trim().replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 100) || null;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ ok: false }, { status: 403 });
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("sales_funnel_events").insert({
      event_name: parsed.data.eventName,
      page_path: parsed.data.pagePath,
      utm_source: parsed.data.utmSource || null,
      utm_medium: parsed.data.utmMedium || null,
      utm_campaign: parsed.data.utmCampaign || null,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
