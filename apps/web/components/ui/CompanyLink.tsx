import Link from "next/link";

export function CompanyLink({ id, name, className = "" }: { id: string; name: string; className?: string }) {
  return (
    <Link href={`/empresas/${id}`} className={`group inline-flex min-w-0 items-baseline gap-2 ${className}`}>
      <span className="truncate text-ink transition-colors group-hover:text-accent">{name}</span>
      <span className="num shrink-0 text-[10px] text-ink-mute">{id}</span>
    </Link>
  );
}
