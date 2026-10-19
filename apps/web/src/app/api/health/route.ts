import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = performance.now();
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("tenant_domains").select("id", { head: true, count: "exact" }).limit(1);
    if (error) throw error;
    return NextResponse.json({ status: "ok", database: "ok", version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || process.env.APP_VERSION || "local", checkedAt: new Date().toISOString(), latencyMs: Math.round(performance.now() - startedAt) }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "degraded", database: "unavailable", checkedAt: new Date().toISOString() }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
