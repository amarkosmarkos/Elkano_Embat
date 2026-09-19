import Link from "next/link";

/** Team identity, kept distinct from Embat's official wordmark. */
export function PresentationBrand(){
  return <Link href="/intro/" className="scene-wordmark" aria-label="Elkano, inicio de la presentación">
    <svg viewBox="0 0 28 28" width="26" height="26" aria-hidden="true" fill="none"><path d="M14 2 25 22H3L14 2Z" stroke="currentColor" strokeWidth="1.5"/><path d="M14 2v20M3 22l11-7 11 7" stroke="currentColor" strokeWidth="1.5"/></svg>
    <span className="brand-name">Elkano</span>
  </Link>;
}
