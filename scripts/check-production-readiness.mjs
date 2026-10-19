const required = [
  "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY",
  "NEXT_PUBLIC_APP_BASE_DOMAIN", "AGENCIA3D_APP_URL", "AGENCIA3D_ADMIN_HOST",
  "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID", "CLOUDFLARE_SAAS_CNAME_TARGET",
];
const placeholders = /replace_me|localhost|127\.0\.0\.1/i;
const missing = required.filter((name) => !process.env[name] || placeholders.test(process.env[name]));
if (missing.length) {
  console.error(`Produção ainda não está configurada: ${missing.join(", ")}`);
  process.exit(1);
}
if (process.env.AGENCIA3D_LOCAL_DEMO_AUTO_LOGIN === "true") {
  console.error("AGENCIA3D_LOCAL_DEMO_AUTO_LOGIN deve ficar desativado em produção.");
  process.exit(1);
}
console.log("Configuração mínima de produção presente.");
