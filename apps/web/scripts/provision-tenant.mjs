import { createClient } from "@supabase/supabase-js";

function readArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--") || !argv[index + 1] || argv[index + 1].startsWith("--")) {
      throw new Error(`Argumento inválido: ${key}`);
    }
    values.set(key.slice(2), argv[index + 1]);
    index += 1;
  }
  for (const required of ["name", "slug", "owner-name", "owner-email"]) {
    if (!values.has(required)) throw new Error(`Argumento obrigatório ausente: --${required}`);
  }
  return values;
}

async function findUserByEmail(supabase, email) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 1000) return null;
  }
}

async function main() {
  const args = readArguments(process.argv.slice(2));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const appUrl = process.env.AGENCIA3D_APP_URL;
  const baseDomain = process.env.NEXT_PUBLIC_APP_BASE_DOMAIN;
  if (!url || !secretKey || !baseDomain || !appUrl) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, NEXT_PUBLIC_APP_BASE_DOMAIN e AGENCIA3D_APP_URL.");
  }

  const slug = args.get("slug").trim().toLowerCase();
  const email = args.get("owner-email").trim().toLowerCase();
  const host = `${slug}.${baseDomain}`.trim().toLowerCase();
  const ownerName = args.get("owner-name").trim();
  const tenantName = args.get("name").trim();
  const slugPattern = /^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/;
  const hostPattern = /^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?)*$/;
  if (!slugPattern.test(slug) || !hostPattern.test(host) || /[\/@?#:]/.test(host)) {
    throw new Error("Slug ou host inválido. Use letras minúsculas, números e hífens.");
  }
  if (tenantName.length < 2 || tenantName.length > 120 || ownerName.length < 1 || ownerName.length > 120 || !email.includes("@")) {
    throw new Error("Informe o nome da empresa, nome do owner e e-mail válidos.");
  }
  const inviteRedirect = new URL("/auth/callback", appUrl);
  inviteRedirect.hostname = host;
  const supabase = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

  let owner = await findUserByEmail(supabase, email);
  if (!owner) {
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { full_name: ownerName },
      redirectTo: inviteRedirect.toString(),
    });
    if (error) {
      owner = await findUserByEmail(supabase, email);
      if (!owner) throw error;
    } else {
      owner = data.user;
    }
  }

  const { data: tenantId, error } = await supabase.rpc("provision_tenant_with_owner", {
    p_name: tenantName,
    p_slug: slug,
    p_host: host,
    p_owner_id: owner.id,
    p_owner_name: ownerName,
    p_owner_email: email,
  });
  if (error) {
    throw new Error(`Convite criado ou reutilizado, mas a ativação do tenant falhou. Execute novamente para retomar. ${error.message}`);
  }

  console.log(`Tenant ativo: ${tenantName} (${tenantId})`);
  console.log(`Acesso: ${inviteRedirect.origin}`);
  console.log(`Owner: ${email}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
