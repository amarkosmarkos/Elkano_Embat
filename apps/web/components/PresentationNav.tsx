"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { presentation, presentationHref } from "@/lib/presentation";

export function PresentationNav() {
  const pathname=usePathname(); const router=useRouter();
  const [enabled,setEnabled]=useState(false); const [open,setOpen]=useState(false);
  const path=(pathname??"").replace(/\/$/,"");
  const scene=path.startsWith("/escena")||path.startsWith("/producto")||path==="/calculo-score"||path==="/intro"||path==="/cierre";
  const canonical=path==="/intro"?"/escena/1":path==="/cierre"?"/escena/6":path;
  const paper=path.startsWith("/producto")||path==="/calculo-score"||path==="/escena/8";
  const index=presentation.findIndex(([route])=>route===canonical);
  useEffect(()=>{setEnabled(scene||new URLSearchParams(location.search).get("present")==="1");setOpen(false);},[pathname,scene]);
  useEffect(()=>{
    if(!enabled||index<0)return;
    const key=(e:KeyboardEvent)=>{
      const el=e.target as HTMLElement;
      if(e.altKey||e.ctrlKey||e.metaKey||el.closest("input,textarea,select,video,[contenteditable=true],[role=slider]"))return;
      const offset=e.key==="ArrowRight"?1:e.key==="ArrowLeft"?-1:0;
      const next=presentation[index+offset];
      if(offset&&next){e.preventDefault();router.push(presentationHref(next[0]));}
      if(e.key==="Escape")setOpen(false);
    };
    window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);
  },[enabled,index,router]);
  if(!enabled||index<0)return null;
  const prev=presentation[index-1];const next=presentation[index+1];
  return <nav className={`presentation-nav ${scene&&!paper?"on-scene":"on-product"}`} aria-label="Recorrido de la presentación">
    <div className="presentation-controls">
      {prev?<Link href={presentationHref(prev[0])} aria-label={`Anterior: ${prev[1]}`} className="presentation-arrow">‹</Link>:<span className="presentation-arrow disabled">‹</span>}
      <button onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="presentation-index" className="presentation-current"><span>{String(index+1).padStart(2,"0")} / {presentation.length}</span> {presentation[index][1]} <span>☰</span></button>
      {next?<Link href={presentationHref(next[0])} aria-label={`Siguiente: ${next[1]}`} className="presentation-arrow">›</Link>:<Link href={presentationHref(presentation[0][0])} className="presentation-arrow" aria-label="Volver al principio">↺</Link>}
    </div>
    {open&&<div id="presentation-index" className="presentation-index">{presentation.map(([route,label],i)=><Link key={route} href={presentationHref(route)} aria-current={i===index?"step":undefined}><span>{String(i+1).padStart(2,"0")}</span>{label}</Link>)}</div>}
  </nav>;
}
