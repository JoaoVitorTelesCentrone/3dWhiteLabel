export default function Loading() {
  return (
    <main className="route-loading-page" aria-busy="true">
      <span className="sr-only" role="status" aria-label="Carregando página">Carregando página…</span>
      <span className="loading-spinner route-loading-spinner" aria-hidden="true" />
    </main>
  );
}
