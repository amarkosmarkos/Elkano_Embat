import SubTabs from "./SubTabs";

export default function PageHeader({
  eyebrow,
  title,
  lead,
  tabs,
  aside,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  tabs?: { href: string; label: string }[];
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="mb-1 text-[12px] font-medium text-ink-mute">{eyebrow}</div>
          <h1 className="text-[24px] font-bold leading-tight tracking-[-0.6px] text-ink">{title}</h1>
          {lead && <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-mute">{lead}</p>}
        </div>
        {aside}
      </div>
      {tabs && (
        <div className="mt-5">
          <SubTabs tabs={tabs} />
        </div>
      )}
    </div>
  );
}
