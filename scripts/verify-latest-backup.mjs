import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const directory = resolve(process.env.AGENCIA3D_BACKUP_DIR || ".backups");
if (!existsSync(directory)) {
  console.error("Nenhum diretório de backup encontrado.");
  process.exit(1);
}
const files = readdirSync(directory).filter((name) => name.endsWith(".sql"))
  .map((name) => ({ name, path: resolve(directory, name), modified: statSync(resolve(directory, name)).mtimeMs }))
  .sort((a, b) => b.modified - a.modified);
if (!files.length) {
  console.error("Nenhum backup SQL encontrado.");
  process.exit(1);
}
const latest = files[0];
const contents = readFileSync(latest.path);
if (contents.length < 1024 || !contents.includes(Buffer.from("PostgreSQL database dump"))) {
  console.error(`O arquivo ${latest.name} não parece ser um dump PostgreSQL válido.`);
  process.exit(1);
}
const ageHours = (Date.now() - latest.modified) / 3_600_000;
if (ageHours > 26) {
  console.error(`O backup mais recente tem ${ageHours.toFixed(1)} horas.`);
  process.exit(1);
}
console.log(`${latest.name} · ${(contents.length / 1024 / 1024).toFixed(2)} MB · sha256 ${createHash("sha256").update(contents).digest("hex")}`);
