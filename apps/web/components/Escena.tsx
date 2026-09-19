"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { presentation, presentationHref, sceneMedia, sectionLabel } from "@/lib/presentation";
import { PresentationBrand } from "@/components/PresentationBrand";

type WindowData={key:string;title:string;value:string;detail:string};
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
function Layer({p,from=0,to=1,position="center",children}:{p:number;from?:number;to?:number;position?:string;children:ReactNode}) {
  const alpha=clamp((p-from)/.045)*(to===1?1:clamp((to-p)/.045));
  return <div className={`scene-layer scene-${position}`} aria-hidden={alpha===0} style={{opacity:alpha,transform:`translateY(${(1-alpha)*14}px)`,pointerEvents:alpha>.5?"auto":"none"}}>{children}</div>;
}
export function Escena({number}:{number:number;windows?:WindowData[]}) {
  const media=sceneMedia[number];const track=useRef<HTMLDivElement>(null);const video=useRef<HTMLVideoElement>(null);
  const desired=useRef(0);const [p,setP]=useState(0);const [reduced,setReduced]=useState(false);const [error,setError]=useState(false);const [paused,setPaused]=useState(false);
  const autoplay=number===6;
  useEffect(()=>{
    const mq=window.matchMedia("(prefers-reduced-motion: reduce)");setReduced(mq.matches);
    const change=()=>setReduced(mq.matches);mq.addEventListener("change",change);return()=>mq.removeEventListener("change",change);
  },[]);
  useEffect(()=>{
    const el=track.current;const v=video.current;if(!el||!v)return;
    let raf=0;let disposed=false;
    const query=new URLSearchParams(location.search).get("p");
    const initial=query!==null&&Number.isFinite(Number(query))?clamp(Number(query)):null;
    const seek=()=>{if(disposed||v.seeking||!Number.isFinite(v.duration)||v.readyState<1)return;const target=Math.min(Math.max(0,v.duration-.05),desired.current*v.duration);if(Math.abs(v.currentTime-target)>.03)v.currentTime=target;};
    const scroll=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{if(autoplay)return;const total=el.offsetHeight-innerHeight;const progress=total>0?clamp(-el.getBoundingClientRect().top/total):1;desired.current=progress;setP(progress);if(!reduced)seek();});};
    const ready=()=>{
      if(autoplay){if(initial!==null){desired.current=initial;setP(initial);seek();setPaused(true);}else if(reduced){setP(1);desired.current=1;seek();setPaused(true);}else{v.play().then(()=>setPaused(false)).catch(()=>{setPaused(true);setP(1);});}}
      else{if(initial!==null)window.scrollTo(0,el.offsetTop+initial*(el.offsetHeight-innerHeight));scroll();}
    };
    const ended=()=>{setP(1);setPaused(true);};
    const time=()=>{if(autoplay&&Number.isFinite(v.duration)&&!v.paused)setP(clamp(v.currentTime/v.duration));};
    // Only scroll-driven scenes coalesce seeks. Autoplay must never seek back to zero.
    v.addEventListener("loadedmetadata",ready);if(!autoplay)v.addEventListener("seeked",seek);v.addEventListener("timeupdate",time);v.addEventListener("ended",ended);
    window.addEventListener("scroll",scroll,{passive:true});window.addEventListener("resize",scroll);
    if(v.readyState>=1)ready();else scroll();
    return()=>{disposed=true;cancelAnimationFrame(raf);v.pause();v.removeEventListener("loadedmetadata",ready);v.removeEventListener("seeked",seek);v.removeEventListener("timeupdate",time);v.removeEventListener("ended",ended);window.removeEventListener("scroll",scroll);window.removeEventListener("resize",scroll);};
  },[autoplay,reduced]);
  const index=presentation.findIndex(([route])=>route===`/escena/${number}`);const next=index>=0?presentation[index+1]:undefined;
  return <div ref={track} className={`scene-track scene-number-${number}`} style={{height:`${autoplay?100:media.height}svh`}}>
    <section className="scene-stage" aria-label={media.title}>
      <video ref={video} className="scene-video" src={media.video} poster={media.poster} preload="auto" muted playsInline onError={()=>setError(true)} aria-label={`Plano de ${media.title}`}/>
      <div className="scene-shade"/>
      <header className="scene-masthead"><PresentationBrand/><span>HackSpain 2026, reto de Embat</span><span className="scene-chapter">{sectionLabel[number]}</span></header>
      {number===1&&<>
        <Layer p={Math.max(.05,p)} to={.46} position="right"><div className="story-intro-card"><p className="scene-eyebrow">QUIÉNES SOMOS</p><h1>Somos Elkano.</h1><p>Somos Luken, Nagore, Markos, David y Xuban. Nos subimos al barco de Embat con los datos de 1.286 empresas en 250 grupos: 24 meses, 2.556.437 movimientos y 897.894 facturas.</p></div></Layer>
        <Layer p={p} from={.48} position="right"><div className="story-intro-card"><p className="scene-eyebrow">POR QUÉ ESTE TRACK</p><h1>El dinero<br/><em>deja rastro.</em></h1><p>Elegimos este track porque el dinero deja rastro y casi nadie lo lee. Embat ve el de 400 empresas cada día. Nos ha dado los datos de 1.286 para probar que podemos detectar lo que ocurre antes de que sea evidente.</p></div></Layer>
      </>}
      {number===3&&<><Layer p={Math.max(.05,p)} to={.7} position="right"><div className="story-overlay-placeholder"><p className="scene-eyebrow">EL PROBLEMA, ANIMACIÓN PENDIENTE</p><h2>Patrones en los datos</h2><p>Cinco constelaciones para leer la caja, la deuda, los cobros, los pagos y el grupo.</p><span>Espacio reservado para las constelaciones SVG.</span></div></Layer><Layer p={p} from={.72}><h1>¿Y si hubiera una manera más directa de entender la salud de una empresa?</h1><div className="story-logo-placeholder">Pendiente: constelación con el símbolo de Embat</div></Layer></>}
      {number===4&&<div className="story-video-pending"><span>NUEVO PLANO PENDIENTE</span> Cofre con tres papiros; uno se desenrolla. Vídeo actual como referencia temporal.</div>}
      {number===5&&<><Layer p={Math.max(.05,p)} to={.54} position="right"><p className="scene-eyebrow">QUIÉN GANA CON ESTO</p><div className="scene-product"><h2>La empresa</h2><p>Gana interés que hoy no gana, deja de pagar intereses por dinero que ya tiene y evita el descubierto de julio.</p></div><div className="scene-product"><h2>Embat</h2><p>Dos módulos nuevos sobre 400 clientes, comisión por cada colocación, y una razón para que el financiero entre cada día.</p></div></Layer><Layer p={p} from={.52}><p className="scene-eyebrow">SOLO EN ESTE DATASET</p><div className="scene-metrics"><div><strong>535 M€</strong><p>parados en 312 empresas</p></div><div><strong>85 M€</strong><p>neteables hoy</p></div><div><strong>182</strong><p>empresas avisadas antes del impago con cuatro meses de antelación</p></div></div></Layer></>}
      {number===6&&<Layer p={p} from={.5}><h1 className="story-thanks">Gracias por escuchar.</h1><p className="scene-credits">Luken, Nagore, Markos, David y Xuban</p><p className="scene-eyebrow">HackSpain 2026, Reto X Ray de Embat</p></Layer>}
      <div className="scene-bottom"><span>{autoplay?"EL VIAJE CONTINÚA":p<.94?"DESLIZA PARA AVANZAR":"SIGUIENTE CAPÍTULO"}</span>{!autoplay&&<span>{Math.round(p*100)}%</span>}
        {next&&p>.90&&<Link className="scene-next" href={presentationHref(next[0])}>Siguiente, {next[1]} <span>›</span></Link>}
        {autoplay&&<button className="scene-next" onClick={()=>{const v=video.current;if(!v)return;if(v.ended||p>=1){v.currentTime=0;setP(0);}if(v.paused){v.play().then(()=>setPaused(false)).catch(()=>setPaused(true));}else{v.pause();setPaused(true);}}}>{paused?"Reproducir":"Pausar"}</button>}
      </div>
      {error&&<p className="scene-media-error">No se ha podido cargar el vídeo. Puedes continuar con la presentación.</p>}
      <div className="scene-progress" role="progressbar" aria-label="Recorrido de la escena" aria-valuenow={Math.round(p*100)} aria-valuemin={0} aria-valuemax={100}><div style={{transform:`scaleX(${p})`}}/></div>
    </section>
  </div>;
}
