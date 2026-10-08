import { createClient } from "@supabase/supabase-js";

function readArgs(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    if (!argv[index]?.startsWith("--") || !argv[index + 1]) throw new Error("Use --name e --email.");
    values.set(argv[index].slice(2), argv[index + 1]);
  }
  const name = values.get("name")?.trim();
  const email = values.get("email")?.trim().toLowerCase();
  if (!name || name.length > 120 || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Informe --name e --email válidos.");
  }
  return { name, email };
}

async function findByEmail(client, email) {
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((entry) => entry.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 1000) return null;
  }
  throw new Error("Limite de usuários excedido.");
}

async function main() {
  const { name, email } = readArgs(process.argv.slice(2));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const host = process.env.AGENCIA3D_ADMIN_HOST;
  if (!url || !secret || !host) throw new Error("Configure Supabase e AGENCIA3D_ADMIN_HOST em .env.local.");
  const client = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  let user = await findByEmail(client, email);
  if (user) {
    const { data: profile, error } = await client.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (error) throw error;
    if (profile) throw new Error("Use uma conta separada das contas de tenant.");
  } else {
    const redirectTo = (host.includes("localhost") ? "http://" : "https://") + host + "/auth/callback";
    const { data, error } = await client.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name }, redirectTo,
    });
    if (error || !data.user) throw error ?? new Error("Convite não criado.");
    user = data.user;
  }
  const { error } = await client.from("platform_admins").upsert({
    id: user.id, full_name: name, active: true,
  }, { onConflict: "id" });
  if (error) throw error;
  console.log("Administrador Agencia 3D ativo: " + email);
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
