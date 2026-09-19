"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { presentation, presentationHref, sceneMedia, sectionLabel } from "@/lib/presentation";

type WindowData={key:string;title:string;value:string;detail:string};
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
function Layer({p,from=0,to=1,position="center",children}:{p:number;from?:number;to?:number;position?:string;children:ReactNode}) {
  const alpha=clamp((p-from)/.045)*(to===1?1:clamp((to-p)/.045));
  return <div className={`scene-layer scene-${position}`} aria-hidden={alpha===0} style={{opacity:alpha,transform:`translateY(${(1-alpha)*14}px)`,pointerEvents:alpha>.5?"auto":"none"}}>{children}</div>;
}
export function Escena({number}:{number:number;windows?:WindowData[]}) {
  const router=useRouter();
  const index=presentation.findIndex(([route])=>route===`/escena/${number}`);const next=index>=0?presentation[index+1]:undefined;
  const nextHref=next?presentationHref(next[0]):null;
  const advancing=useRef(false);const [playing,setPlaying]=useState(false);
  const media=sceneMedia[number];const track=useRef<HTMLDivElement>(null);const video=useRef<HTMLVideoElement>(null);
  const desired=useRef(0);const [p,setP]=useState(0);const [reduced,setReduced]=useState(false);const [error,setError]=useState(false);const [paused,setPaused]=useState(false);
  const autoplay=number===6;
  useEffect(()=>{
    const mq=window.matchMedia("(prefers-reduced-motion: reduce)");setReduced(mq.matches);
    const change=()=>setReduced(mq.matches);mq.addEventListener("change",change);return()=>mq.removeEventListener("change",change);
  },[]);
  useEffect(()=>{
    const el=track.current;const v=video.current;if(!el||!v)return;
    let raf=0;let playbackRaf=0;let nextTimer=0;let disposed=false;
    const query=new URLSearchParams(location.search).get("p");
    const initial=query!==null&&Number.isFinite(Number(query))?clamp(Number(query)):null;
    const seek=()=>{if(disposed||advancing.current||v.seeking||!Number.isFinite(v.duration)||v.readyState<1)return;const target=Math.min(Math.max(0,v.duration-.05),desired.current*v.duration);if(Math.abs(v.currentTime-target)>.03)v.currentTime=target;};
    const scroll=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{if(autoplay||advancing.current)return;const total=el.offsetHeight-innerHeight;const progress=total>0?clamp(-el.getBoundingClientRect().top/total):1;desired.current=progress;setP(progress);if(!reduced)seek();});};
    const ready=()=>{
      if(autoplay){if(initial!==null){desired.current=initial;setP(initial);seek();setPaused(true);}else if(reduced){setP(1);desired.current=1;seek();setPaused(true);}else{v.play().then(()=>setPaused(false)).catch(()=>{setPaused(true);setP(1);});}}
      else{if(initial!==null)window.scrollTo(0,el.offsetTop+initial*(el.offsetHeight-innerHeight));scroll();}
    };
    const stop=()=>{if(!advancing.current)return;advancing.current=false;cancelAnimationFrame(playbackRaf);clearTimeout(nextTimer);v.pause();setPlaying(false);};
    const syncPlayback=()=>{
      if(disposed||!advancing.current)return;
      if(Number.isFinite(v.duration)&&v.duration>0){const progress=clamp(v.currentTime/v.duration);desired.current=progress;setP(progress);window.scrollTo({top:el.offsetTop+progress*(el.offsetHeight-innerHeight),behavior:"instant"});}
      playbackRaf=requestAnimationFrame(syncPlayback);
    };
    const advance=()=>{
      if(advancing.current||!nextHref||v.readyState<1)return;
      advancing.current=true;setPlaying(true);cancelAnimationFrame(raf);
      if(reduced){desired.current=1;setP(1);window.scrollTo({top:el.offsetTop+el.offsetHeight-innerHeight,behavior:"instant"});nextTimer=window.setTimeout(()=>router.push(nextHref),250);return;}
      v.play().then(()=>{if(!disposed&&advancing.current)syncPlayback();}).catch(()=>{stop();setError(true);});
    };
    const escape=(e:KeyboardEvent)=>{if(e.key==="Escape")stop();};
    const notify=()=>window.dispatchEvent(new CustomEvent("elkano:play-state",{detail:!v.paused&&!v.ended}));
    const toggle=()=>{if(advancing.current){stop();return;}if(!autoplay){advance();return;}if(!v.paused){v.pause();return;}if(v.ended){v.currentTime=0;setP(0);}v.play().catch(()=>setError(true));};
    const ended=()=>{setP(1);setPaused(true);if(advancing.current&&nextHref){cancelAnimationFrame(playbackRaf);nextTimer=window.setTimeout(()=>{if(!disposed)router.push(nextHref);},450);}};
    const time=()=>{if(autoplay&&Number.isFinite(v.duration)&&!v.paused)setP(clamp(v.currentTime/v.duration));};
    // Only scroll-driven scenes coalesce seeks. Autoplay must never seek back to zero.
    v.addEventListener("loadedmetadata",ready);if(!autoplay)v.addEventListener("seeked",seek);v.addEventListener("timeupdate",time);v.addEventListener("ended",ended);
    window.addEventListener("scroll",scroll,{passive:true});window.addEventListener("resize",scroll);
    window.addEventListener("elkano:advance",advance);window.addEventListener("wheel",stop,{passive:true});window.addEventListener("touchstart",stop,{passive:true});window.addEventListener("keydown",escape);
    window.addEventListener("elkano:toggle-play",toggle);v.addEventListener("play",notify);v.addEventListener("pause",notify);v.addEventListener("ended",notify);
    if(v.readyState>=1)ready();else scroll();
    return()=>{disposed=true;advancing.current=false;cancelAnimationFrame(raf);cancelAnimationFrame(playbackRaf);clearTimeout(nextTimer);v.pause();v.removeEventListener("loadedmetadata",ready);v.removeEventListener("seeked",seek);v.removeEventListener("timeupdate",time);v.removeEventListener("ended",ended);window.removeEventListener("scroll",scroll);window.removeEventListener("resize",scroll);window.removeEventListener("elkano:advance",advance);window.removeEventListener("wheel",stop);window.removeEventListener("touchstart",stop);window.removeEventListener("keydown",escape);window.removeEventListener("elkano:toggle-play",toggle);v.removeEventListener("play",notify);v.removeEventListener("pause",notify);v.removeEventListener("ended",notify);};
  },[autoplay,reduced,nextHref,router]);
  return <div ref={track} className={`scene-track scene-number-${number}`} style={{height:`${autoplay?100:media.height}svh`}}>
    <section className="scene-stage" aria-label={media.title}>
      <video ref={video} className="scene-video" src={media.video} poster={media.poster} preload="auto" muted playsInline onError={()=>setError(true)} aria-label={`Plano de ${media.title}`}/>
      <div className="scene-shade"/>
      {number===1&&<>
        <Layer p={Math.max(.05,p)} to={.46} position="right"><div className="story-intro-card"><p className="scene-eyebrow">QUIÉNES SOMOS</p><div className="intro-identity"><img src="/images/elkano-head.png" alt="Rostro de Juan Sebastián Elcano" width="1254" height="1254"/><h1>Somos<br/>Elkano.</h1></div><p>Somos Luken, Nagore, Markos, David y Xuban. Nos subimos al barco de Embat con los datos de 1.286 empresas en 250 grupos: 24 meses, 2.556.437 movimientos y 897.894 facturas.</p></div></Layer>
        <Layer p={p} from={.48} position="right"><div className="story-intro-card"><p className="scene-eyebrow">POR QUÉ ESTE TRACK</p><h1>El dinero<br/><em>deja rastro.</em></h1><p>Elegimos este track porque el dinero deja rastro y casi nadie lo lee. Embat ve el de 400 empresas cada día. Nos ha dado los datos de 1.286 para probar que podemos detectar lo que ocurre antes de que sea evidente.</p></div></Layer>
      </>}
      {number===3&&<><Layer p={Math.max(.05,p)} to={.7} position="right"><div className="story-overlay-placeholder"><p className="scene-eyebrow">EL PROBLEMA, ANIMACIÓN PENDIENTE</p><h2>Patrones en los datos</h2><p>Cinco constelaciones para leer la caja, la deuda, los cobros, los pagos y el grupo.</p><span>Espacio reservado para las constelaciones SVG.</span></div></Layer><Layer p={p} from={.72}><h1>¿Y si hubiera una manera más directa de entender la salud de una empresa?</h1><div className="story-logo-placeholder">Pendiente: constelación con el símbolo de Embat</div></Layer></>}
      {number===4&&<div className="story-video-pending"><span>NUEVO PLANO PENDIENTE</span> Cofre con tres papiros; uno se desenrolla. Vídeo actual como referencia temporal.</div>}
      {number===5&&<><Layer p={Math.max(.05,p)} to={.54} position="right"><p className="scene-eyebrow">QUIÉN GANA CON ESTO</p><div className="scene-product"><h2>La empresa</h2><p>Gana interés que hoy no gana, deja de pagar intereses por dinero que ya tiene y evita el descubierto de julio.</p></div><div className="scene-product"><h2>Embat</h2><p>Dos módulos nuevos sobre 400 clientes, comisión por cada colocación, y una razón para que el financiero entre cada día.</p></div></Layer><Layer p={p} from={.52}><p className="scene-eyebrow">SOLO EN ESTE DATASET</p><div className="scene-metrics"><div><strong>535 M€</strong><p>parados en 312 empresas</p></div><div><strong>85 M€</strong><p>neteables hoy</p></div><div><strong>182</strong><p>empresas avisadas antes del impago con cuatro meses de antelación</p></div></div></Layer></>}
      {number===6&&<Layer p={p} from={.5}><h1 className="story-thanks">Gracias por escuchar.</h1><p className="scene-credits">Luken, Nagore, Markos, David y Xuban</p><p className="scene-eyebrow">HackSpain 2026, Reto X Ray de Embat</p></Layer>}
      {error&&<p className="scene-media-error">No se ha podido cargar el vídeo. Puedes continuar con la presentación.</p>}
      <div className="scene-progress" role="progressbar" aria-label="Recorrido de la escena" aria-valuenow={Math.round(p*100)} aria-valuemin={0} aria-valuemax={100}><div style={{transform:`scaleX(${p})`}}/></div>
    </section>
  </div>;
}
