export default function StatTile({ n, l }: { n: string; l: string }) {
  return (
    <div className="border-l border-line-soft px-5 py-1.5 first:border-l-0 first:pl-0">
      <div className="font-mono text-2xl font-semibold text-accent">{n}</div>
      <div className="mt-1 text-xs text-ink-mute">{l}</div>
    </div>
  );
}
