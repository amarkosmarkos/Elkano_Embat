import "./globals.css";
import "./embat-presentation.css";
import type { Metadata } from "next";
import { Shell } from "@/components/Shell";
import { getFeaturedCompanyId, getFeaturedGroupId, getOverview } from "@/lib/data";

export const metadata: Metadata = {
  title: "Elkano",
  icons: { icon: [{ url: "/images/elkano-head.png", type: "image/png" }], apple: "/images/elkano-head.png" },
  description: "HackSpain 2026, Embat X Ray, Score de salud de tesorería para 1.286 empresas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const overview = getOverview();
  return (
    <html lang="es">
      <body className="antialiased bg-surface min-h-screen">
        <Shell
          companyId={getFeaturedCompanyId()}
          groupId={getFeaturedGroupId()}
          monthLast={overview.month_last}
          footer={
            <>
              Elkano, HackSpain 2026, Track Embat «X Ray», Datos anonimizados: {overview.n_companies.toLocaleString("es-ES")} empresas, {overview.months} meses.
            </>
          }
        >
          {children}
        </Shell>
      </body>
    </html>
  );
}
