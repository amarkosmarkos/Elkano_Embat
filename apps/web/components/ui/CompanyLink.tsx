import Link from "next/link";

export function CompanyLink({ id, name, className = "", showId = true }: { id: string; name: string; className?: string; showId?: boolean }) {
  return (
    <Link href={`/empresas/${id}`} className={`group inline-flex min-w-0 items-baseline gap-2 ${className}`}>
      <span className="truncate text-ink transition-colors group-hover:text-accent">{name}</span>
      {showId && <span className="num shrink-0 text-[10px] text-ink-mute">{id}</span>}
    </Link>
  );
}
