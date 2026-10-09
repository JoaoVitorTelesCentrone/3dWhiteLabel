import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getRequestUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  return error || typeof userId !== "string" ? null : userId;
});
