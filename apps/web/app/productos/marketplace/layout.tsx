import { MarketplaceProvider } from "@/lib/products/marketplace/store";
import FlowHeader from "@/components/marketplace/FlowHeader";

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketplaceProvider>
      <div className="mb-4"><div className="text-[12px] font-medium text-ink-mute">Producto 01 · Marketplace de crédito</div><h1 className="text-[24px] font-bold leading-tight tracking-[-0.6px] text-ink">Embat Capital Network</h1></div>
      <FlowHeader />
      {children}
    </MarketplaceProvider>
  );
}
