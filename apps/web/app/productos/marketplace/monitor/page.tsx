import Monitor from "@/components/marketplace/Monitor";

export default async function MonitorPage({ searchParams }: { searchParams: Promise<{ deal?: string; tab?: string }> }) {
  const { deal, tab } = await searchParams;
  return <Monitor dealId={deal ?? null} initialTab={tab === "acciones" ? "acciones" : "seguimiento"} />;
}
