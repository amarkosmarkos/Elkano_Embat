import Link from "next/link";
import { presentation, presentationHref } from "@/lib/presentation";

export function StoryPlaceholder({path,title,section,slots,links=[],hybrid=false}:{
  path:string;title:string;section:string;slots:string[];
  links?:{label:string;href:string}[];hybrid?:boolean;
}) {
  const index=presentation.findIndex(([route])=>route===path);
  const next=presentation[index+1];
  return <main className={`story-placeholder ${hybrid?"story-hybrid":""}`}>
    <header className="story-header"><Link href="/intro/" className="scene-wordmark">ELKANO<span>✧</span></Link><span>HACKSPAIN 2026, X RAY, EMBAT</span><Link href="/">Abrir plataforma</Link></header>
    <div className="story-content"><p className="scene-eyebrow">{section}, {hybrid?"HÍBRIDA":"WEB PURA"}</p><h1>{title}</h1><span className="story-draft-tag">BORRADOR. CONTENIDO PENDIENTE</span>
      {hybrid&&<div className="story-visual-placeholder"><span>PLANO NUEVO PENDIENTE</span><h2>Isla con ciudad y barcos amarrados</h2><p>Cada barco representa una empresa.</p></div>}
      <div className="story-slots">{slots.map((label,i)=><section className="story-slot" key={label}><span>0{i+1}</span><h2>{label}</h2><div aria-hidden="true" className="story-empty"/></section>)}</div>
      {links.length>0&&<aside className="story-existing"><p>App existente, fuera del recorrido</p>{links.map(link=><Link key={link.href} href={link.href}>{link.label} ↗</Link>)}</aside>}
      {next&&<Link className="story-continue" href={presentationHref(next[0])}>Siguiente, {next[1]} <span>›</span></Link>}
    </div>
  </main>;
}
