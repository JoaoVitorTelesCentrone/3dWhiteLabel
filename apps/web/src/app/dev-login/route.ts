import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const host = (await headers()).get("host")?.toLowerCase();
  const email = process.env.AGENCIA3D_LOCAL_DEMO_EMAIL;
  const password = process.env.AGENCIA3D_LOCAL_DEMO_PASSWORD;

  if (
    process.env.NODE_ENV !== "development" ||
    process.env.AGENCIA3D_LOCAL_DEMO_AUTO_LOGIN !== "true" ||
    !["demo.localhost:3005", "localhost:3005", "127.0.0.1:3005"].includes(host ?? "") ||
    !email ||
    !password
  ) {
    return new Response("Acesso indisponível.", { status: 404 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return new Response("Não foi possível abrir a conta demo.", { status: 500 });

  redirect("/dashboard");
}
