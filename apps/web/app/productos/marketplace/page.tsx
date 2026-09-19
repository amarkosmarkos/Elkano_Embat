import Link from "next/link";
import PageHeader from "@/components/shell/PageHeader";
import { NAV } from "@/components/shell/nav";

const BASE = process.env.NEXT_PUBLIC_MARKETPLACE_URL ?? "http://localhost:8080";

/** Producto 01: la app del marketplace (apps/marketplace, Vite + nginx) embebida tal cual, a pantalla completa. */
export default async function MarketplacePage({ searchParams }: { searchParams: Promise<{ company?: string; screen?: string }> }) {
  const { company, screen } = await searchParams;
  const path = company ? `/company/${company}` : screen ? `/${screen}` : "/";
  return (
    <>
      <PageHeader
        eyebrow="Producto 01 · Marketplace de crédito"
        title="Embat Capital Network"
        lead={<>Prestamistas → receptores → cofre → monitor → acciones, todo sobre el score v3 y sus 24 métricas. Corre como app propia en <span className="num">{BASE}</span> (<span className="num">docker compose --profile marketplace up</span>).</>}
        tabs={NAV[5].children}
        aside={
          <div className="flex flex-wrap gap-2 text-[11.5px]">
            {[["/", "Prestamistas"], ["/borrowers", "Receptores"], ["/monitor", "Monitor"], ["/monitor/actions", "Acciones"]].map(([p, l]) => <Link key={p} href={`/productos/marketplace?screen=${p.replace(/^\//, "")}`} className="rounded-lg border border-line px-3 py-1 text-ink-dim hover:text-ink">{l}</Link>)}
            <a href={`${BASE}${path}`} target="_blank" rel="noreferrer" className="rounded-lg bg-ink px-3 py-1 font-semibold text-panel">Abrir en pestaña ↗</a>
          </div>
        }
      />
      <div className="card overflow-hidden p-0" style={{ height: "calc(100vh - 250px)", minHeight: 720 }}>
        <iframe src={`${BASE}${path}`} title="Embat Capital Network" className="h-full w-full border-0" />
      </div>
    </>
  );
}
