import { notFound } from "next/navigation";

// Rota reservada para o fallback do catálogo desativado.
export default function DisabledCatalogPage() {
  notFound();
}
