"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { presentation, presentationHref } from "@/lib/presentation";

export function PresentationNav() {
  const pathname=usePathname(); const router=useRouter();
  const [enabled,setEnabled]=useState(false); const [open,setOpen]=useState(false);
  const [playing,setPlaying]=useState(false);
  const path=(pathname??"").replace(/\/$/,"");
  const scene=path.startsWith("/escena")||path.startsWith("/producto")||path==="/calculo-score"||path==="/intro"||path==="/cierre";
  const canonical=path==="/intro"?"/escena/1":path==="/cierre"?"/escena/6":path;
  const paper=path.startsWith("/producto")||path==="/calculo-score"||path==="/escena/8";
  const index=presentation.findIndex(([route])=>route===canonical);
  useEffect(()=>{setEnabled(scene||new URLSearchParams(location.search).get("present")==="1");setOpen(false);},[pathname,scene]);
  useEffect(()=>{setPlaying(false);const update=(e:Event)=>setPlaying((e as CustomEvent<boolean>).detail);window.addEventListener("elkano:play-state",update);return()=>window.removeEventListener("elkano:play-state",update);},[pathname]);
  useEffect(()=>{
    if(!enabled||index<0)return;
    const key=(e:KeyboardEvent)=>{
      const el=e.target as HTMLElement;
      if(e.altKey||e.ctrlKey||e.metaKey||el.closest("input,textarea,select,video,[contenteditable=true],[role=slider]"))return;
      const offset=e.key==="ArrowRight"?1:e.key==="ArrowLeft"?-1:0;
      const next=presentation[index+offset];
      if(offset&&next){e.preventDefault();if(e.repeat)return;if(offset===1&&scene&&!paper&&!e.shiftKey){window.dispatchEvent(new Event("elkano:advance"));}else router.push(presentationHref(next[0]));}
      if(e.key==="Escape")setOpen(false);
    };
    window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);
  },[enabled,index,router,scene,paper]);
  if(!enabled||index<0)return null;
  const prev=presentation[index-1];const next=presentation[index+1];
  return <nav className={`presentation-nav ${scene&&!paper?"on-scene":"on-product"}`} aria-label="Recorrido de la presentación">
    <div className="presentation-controls">
      {prev?<Link href={presentationHref(prev[0])} aria-label={`Anterior: ${prev[1]}`} className="presentation-arrow">‹</Link>:<span className="presentation-arrow disabled">‹</span>}
      {scene&&!paper&&<button className="presentation-play" title={playing?"Pausar animación":"Reproducir animación"} aria-label={playing?"Pausar animación":"Reproducir animación"} onClick={()=>window.dispatchEvent(new Event("elkano:toggle-play"))}>{playing?<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><path d="M3 2h3v10H3zM8 2h3v10H8z"/></svg>:<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><path d="m4 1 9 6-9 6z"/></svg>}</button>}
      <button onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="presentation-index" className="presentation-current"><span>{String(index+1).padStart(2,"0")} / {presentation.length}</span> {presentation[index][1]} <span>☰</span></button>
      {next?<Link href={presentationHref(next[0])} onClick={e=>{if(scene&&!paper&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey){e.preventDefault();window.dispatchEvent(new Event("elkano:advance"));}}} title={scene&&!paper?"Reproducir la escena y continuar":"Siguiente sección"} aria-label={`Siguiente: ${next[1]}`} className="presentation-arrow">›</Link>:<Link href={presentationHref(presentation[0][0])} className="presentation-arrow" aria-label="Volver al principio">↺</Link>}
      {next&&<Link href={presentationHref(next[0])} className="presentation-arrow presentation-skip" title="Saltar sin animación (Mayús + derecha)" aria-label={`Saltar sin animación: ${next[1]}`}>»</Link>}
    </div>
    {open&&<div id="presentation-index" className="presentation-index">{presentation.map(([route,label],i)=><Link key={route} href={presentationHref(route)} aria-current={i===index?"step":undefined}><span>{String(i+1).padStart(2,"0")}</span>{label}</Link>)}</div>}
  </nav>;
}
