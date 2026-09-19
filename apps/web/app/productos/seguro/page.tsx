import InsuranceDashboard from "@/components/insurance/InsuranceDashboard";
import { getStore } from "@/lib/data/store";

export const metadata = {
  title: "Seguro de crédito dinámico · Elkano X-Ray",
  description: "Prima de seguro de crédito que se actualiza con la evolución mensual del score.",
};

export default async function InsurancePage() {
  const store = await getStore();
  const companyNames = Object.fromEntries(store.companies.map((company) => [company.id, company.name]));

  return <InsuranceDashboard companyNames={companyNames} />;
}
