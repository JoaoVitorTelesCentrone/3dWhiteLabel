"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@agencia3d/db/types";

export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Configuração pública do Supabase ausente.");
  return createBrowserClient<Database>(url, key);
}
