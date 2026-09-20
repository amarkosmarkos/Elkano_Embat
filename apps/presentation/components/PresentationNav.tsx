"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { PresentationIcon } from "@/components/PresentationIcons";
import { presentation, presentationHref, sceneMedia, demoMedia } from "@/lib/presentation";
import { useDemoMode } from "@/lib/demo-mode";

let developmentWarmup: Promise<void> | undefined;

export function PresentationNav() {
  const pathname=usePathname(); const router=useRouter();
  const [enabled,setEnabled]=useState(false); const [open,setOpen]=useState(false);
  const [playing,setPlaying]=useState(false);
  const [demo,setDemo]=useDemoMode();
  const [fullscreen,setFullscreen]=useState(false);
  useEffect(()=>{const sync=()=>setFullscreen(Boolean(document.fullscreenElement));sync();document.addEventListener("fullscreenchange",sync);return()=>document.removeEventListener("fullscreenchange",sync);},[]);
  const toggleFullscreen=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{});};
  const path=(pathname??"").replace(/\/$/,"");
  const scene=path.startsWith("/escena")||path.startsWith("/producto")||path.startsWith("/caso/")||path==="/calculo-score"||path==="/anexo"||path==="/intro"||path==="/cierre";
  const canonical=path==="/intro"?"/escena/1":path==="/cierre"?"/escena/6":path;
  const paper=path.startsWith("/producto")||path.startsWith("/caso/")||path==="/calculo-score"||path==="/anexo";
  const index=presentation.findIndex(([route])=>route===canonical);
  useEffect(()=>{setEnabled(scene||new URLSearchParams(location.search).get("present")==="1");setOpen(false);},[pathname,scene]);
  useEffect(()=>{setPlaying(false);const update=(e:Event)=>setPlaying((e as CustomEvent<boolean>).detail);window.addEventListener("elkano:play-state",update);return()=>window.removeEventListener("elkano:play-state",update);},[pathname]);
  useEffect(()=>{
    if(!enabled||process.env.NODE_ENV!=="development"||developmentWarmup)return;
    // Next disables route prefetch in development. Compile the small slide deck
    // sequentially in the background instead of waiting for the first arrow press.
    developmentWarmup=(async()=>{
      for(const [route] of presentation){
        try{const response=await fetch(presentationHref(route),{priority:"low"});await response.text();}
        catch{/* Navigation remains usable if the dev server is restarting. */}
      }
    })();
  },[enabled]);
  useEffect(()=>{
    if(!enabled||index<0)return;
    // Prepare adjacent routes while the current slide is on screen.
    for(const offset of [-1,1]){
      const section=presentation[index+offset];
      if(section)router.prefetch(presentationHref(section[0]));
    }
    const next=presentation[index+1];
    const match=next?.[0].match(/^\/escena\/(\d+)$/);
    const media=match?sceneMedia[Number(match[1])]:null;
    if(!media)return;
    const poster=new Image();poster.src=media.still??media.poster;
    // Warm only the next clip, not the whole presentation. Respect data saving.
    const connection=(navigator as Navigator & {connection?:{saveData?:boolean}}).connection;
    if(media.still||connection?.saveData)return;
    const clip=document.createElement("video");
    clip.preload="auto";clip.muted=true;clip.playsInline=true;
    const timer=window.setTimeout(()=>{clip.src=media.video;clip.load();},300);
    return()=>{clearTimeout(timer);clip.removeAttribute("src");clip.load();};
  },[enabled,index,router]);
  useEffect(()=>{
    if(!enabled||index<0)return;
    const key=(e:KeyboardEvent)=>{
      const el=e.target as HTMLElement;
      if(e.altKey||e.ctrlKey||e.metaKey||el.closest("input:not([type=checkbox]),textarea,select,video,[contenteditable=true],[role=slider]"))return;
      const offset=e.key==="ArrowRight"?1:e.key==="ArrowLeft"?-1:0;
      const next=presentation[index+offset];
      if(offset){e.preventDefault();if(e.repeat)return;if(next)router.push(presentationHref(next[0]));}
      if(e.key==="Escape")setOpen(false);
    };
    window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);
  },[enabled,index,router,scene,paper]);
  if(!enabled||index<0)return null;
  const prev=presentation[index-1];const next=presentation[index+1];
  return <nav className={`presentation-nav ${scene&&!paper?"on-scene":"on-product"}`} aria-label="Recorrido de la presentación">
    <div className="presentation-controls">
      {prev?<Link href={presentationHref(prev[0])} aria-label={`Saltar a la sección anterior: ${prev[1]}`} title="Sección anterior (flecha izquierda)" className="presentation-arrow presentation-skip"><PresentationIcon name="skipLeft"/></Link>:<span className="presentation-arrow disabled" aria-hidden="true"><PresentationIcon name="skipLeft"/></span>}
      {scene&&!paper?<button className="presentation-arrow" aria-label="Reproducir animación hacia atrás" title="Reproducir hacia atrás" onClick={()=>window.dispatchEvent(new Event("elkano:rewind"))}><PresentationIcon name="left"/></button>:prev?<Link href={presentationHref(prev[0])} aria-label={`Anterior: ${prev[1]}`} className="presentation-arrow"><PresentationIcon name="left"/></Link>:<span className="presentation-arrow disabled"><PresentationIcon name="left"/></span>}
      {scene&&!paper?<button className="presentation-play" title={playing?"Pausar animación":"Reproducir animación"} aria-label={playing?"Pausar animación":"Reproducir animación"} onClick={()=>window.dispatchEvent(new Event("elkano:toggle-play"))}>{playing?<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><path d="M3 2h3v10H3zM8 2h3v10H8z"/></svg>:<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><path d="m4 1 9 6-9 6z"/></svg>}</button>:<span className="presentation-play presentation-play-placeholder" aria-hidden="true"/>}
      <button onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="presentation-index" className="presentation-current"><span>{String(index+1).padStart(2,"0")} / {presentation.length}</span> <span className="presentation-title">{presentation[index][1]}</span> <span><PresentationIcon name="menu"/></span></button>
      {next?<Link href={presentationHref(next[0])} onClick={e=>{if(scene&&!paper&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey){e.preventDefault();window.dispatchEvent(new Event("elkano:advance"));}}} title={scene&&!paper?"Reproducir la escena y continuar":"Siguiente sección"} aria-label={`Siguiente: ${next[1]}`} className="presentation-arrow"><PresentationIcon name="right"/></Link>:<Link href={presentationHref(presentation[0][0])} className="presentation-arrow" aria-label="Volver al principio"><PresentationIcon name="restart"/></Link>}
      {next?<Link href={`${presentationHref(next[0])}${next[0].startsWith("/caso/")?"&boat=skip":""}`} className="presentation-arrow presentation-skip" title="Siguiente sección sin animación" aria-label={`Saltar sin animación: ${next[1]}`}><PresentationIcon name="skipRight"/></Link>:<Link href={presentationHref(presentation[0][0])} className="presentation-arrow presentation-skip" aria-label="Volver a la primera sección"><PresentationIcon name="skipRight"/></Link>}
      <button type="button" onClick={toggleFullscreen} className="presentation-arrow presentation-fullscreen" title={fullscreen?"Salir de pantalla completa":"Pantalla completa"} aria-label={fullscreen?"Salir de pantalla completa":"Pantalla completa"} aria-pressed={fullscreen}><PresentationIcon name={fullscreen?"exitFullscreen":"fullscreen"}/></button>
    </div>
    {open&&<div id="presentation-index" className="presentation-index">
      <label className="presentation-mode"><input type="checkbox" checked={demo} onChange={e=>setDemo(e.target.checked)}/>Modo demo<small>{demo?"vídeo en las slides marcadas":"solo slides"}</small></label>
      {presentation.map(([route,label],i)=><Link key={route} href={presentationHref(route)} aria-current={i===index?"step":undefined}><span>{String(i+1).padStart(2,"0")}</span>{label}{demo&&demoMedia[route]&&<em className="presentation-demo-tag">demo</em>}</Link>)}
    </div>}
  </nav>;
}
