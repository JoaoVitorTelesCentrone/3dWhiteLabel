import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="route-loading-page" aria-busy="true">
      <span className="sr-only" role="status" aria-label="Carregando página">Carregando página…</span>
      <div className="route-loading-heading" aria-hidden="true">
        <Skeleton className="route-loading-context" />
        <Skeleton className="route-loading-title" />
        <Skeleton className="route-loading-description" />
      </div>
      <div className="route-loading-list" aria-hidden="true">
        <div className="route-loading-list-head"><Skeleton className="route-loading-count" /><Skeleton className="route-loading-meta" /></div>
        {Array.from({ length: 5 }, (_, index) => (
          <div className="route-loading-row" key={index}>
            <Skeleton className="route-loading-avatar" />
            <div className="route-loading-row-copy"><Skeleton className="route-loading-row-title" /><Skeleton className="route-loading-row-detail" /></div>
            <Skeleton className="route-loading-row-value" />
          </div>
        ))}
      </div>
    </main>
  );
}
