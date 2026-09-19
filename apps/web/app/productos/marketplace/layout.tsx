import PageHeader from "@/components/shell/PageHeader";
import { MARKETPLACE_TABS } from "@/components/shell/nav";
import { MarketplaceProvider } from "@/lib/products/marketplace/store";
import CompanyPanel from "@/components/marketplace/CompanyPanel";

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketplaceProvider>
      <PageHeader eyebrow="Producto 01 · Marketplace de crédito" title="Embat Capital Network" lead="Empresas con excedente de tesorería financian a empresas sanas con necesidad visible de capital. Prestamistas → receptores y cartera → monitor → acciones, todo sobre el score v3, sus cinco dimensiones y las 24 métricas." tabs={MARKETPLACE_TABS} />
      {children}
      <CompanyPanel />
    </MarketplaceProvider>
  );
}
