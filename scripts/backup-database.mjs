import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const databaseUrl = process.env.SUPABASE_DB_URL;
if (!databaseUrl) {
  console.error("Configure SUPABASE_DB_URL com a conexão de produção.");
  process.exit(1);
}
const backupDirectory = resolve(process.env.AGENCIA3D_BACKUP_DIR || ".backups");
mkdirSync(backupDirectory, { recursive: true });
const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const output = resolve(backupDirectory, `agencia3d-${timestamp}.sql`);
const result = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["supabase", "db", "dump", "--db-url", databaseUrl, "--file", output], { stdio: "inherit" });
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`Backup lógico criado em ${output}. Mova-o para armazenamento externo criptografado.`);
