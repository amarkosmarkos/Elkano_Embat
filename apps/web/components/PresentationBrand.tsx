import Link from "next/link";

/** Team identity, kept distinct from Embat's official wordmark. */
export function PresentationBrand(){
  return <div className="presentation-brand-links"><Link href="/intro/" className="scene-wordmark" aria-label="Elkano, inicio de la presentación">
    <img src="/images/elkano-head.png" alt="" width="48" height="48" className="brand-portrait"/>
    <span className="brand-name">Elkano</span>
  </Link><Link href="/plataforma/" className="presentation-platform-link">Plataforma</Link></div>;
}
