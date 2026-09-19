import Lenders from "@/components/marketplace/Lenders";

export default async function LendersPage({ searchParams }: { searchParams: Promise<{ lender?: string }> }) {
  const { lender } = await searchParams;
  return <Lenders initialLender={lender ?? null} />;
}
