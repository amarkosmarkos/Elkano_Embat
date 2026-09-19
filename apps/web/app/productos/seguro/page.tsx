import InsuranceDashboard from "@/components/insurance/InsuranceDashboard";

export const metadata = {
  title: "Seguro de crédito dinámico · Elkano X-Ray",
  description: "Prima de seguro de crédito que se actualiza con la evolución mensual del score.",
};

export default function InsurancePage() {
  return <InsuranceDashboard />;
}
