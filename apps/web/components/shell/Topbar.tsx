import { monthLabelLong } from "@/lib/format";

export default function Topbar({ asOf }: { asOf: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-ground/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1480px] items-center gap-6 px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden whitespace-nowrap text-[14px] text-ink-mute">
          <span className="inline-flex h-2 w-2 rounded-full bg-good" />
          Datos hasta <span className="text-ink">{monthLabelLong(asOf)}</span>
          <span className="mx-1 hidden h-4 w-px shrink-0 bg-line-soft xl:inline-block" />
          <span className="hidden truncate xl:inline">1.282 empresas · 250 grupos · 24 meses</span>
        </div>
      </div>
    </header>
  );
}
