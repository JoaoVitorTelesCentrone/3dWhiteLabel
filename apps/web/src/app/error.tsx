"use client";

import { useEffect } from "react";
import { Button } from "@/components/base-ui/button";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("workspace_error", { digest: error.digest, message: error.message }); }, [error]);
  return <main className="management-page"><div className="empty-state" role="alert"><h1 className="empty-state-title">Não foi possível abrir esta área.</h1><p className="empty-state-hint">Sua sessão continua ativa. Tente carregar novamente; se o problema persistir, informe o horário ao suporte.</p><Button type="button" onClick={reset}>Tentar novamente</Button></div></main>;
}
