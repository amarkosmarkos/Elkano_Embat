"use client";
import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { presentation, presentationHref, sceneMedia, sectionLabel } from "@/lib/presentation";
import { SkyStory } from "@/components/SkyStory";

type WindowData={key:string;title:string;value:string;detail:string};
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
function Layer({p,from=0,to=1,position="center",children}:{p:number;from?:number;to?:number;position?:string;children:ReactNode}) {
  const alpha=clamp((p-from)/.045)*(to===1?1:clamp((to-p)/.045));
  return <div className={`scene-layer scene-${position}`} aria-hidden={alpha===0} style={{opacity:alpha,transform:`translateY(${(1-alpha)*14}px)`,pointerEvents:alpha>.5?"auto":"none"}}>{children}</div>;
}
// Static closing copy: visible in the initial HTML, independent of video state.
const ClosingCopy=memo(function ClosingCopy(){
  return <div className="scene-layer scene-center closing-copy">
    <h1 className="story-thanks">Gracias por escuchar.</h1>
    <p className="scene-credits">Luken, Nagore, Markos, David y Xuban</p>
    <p className="scene-eyebrow">HackSpain 2026 · Embat</p>
    <div className="closing-platform"><Link href="/plataforma/" className="closing-platform-button">Entrar en la plataforma <span aria-hidden="true">→</span></Link></div>
  </div>;
});

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
    v.playbackRate=number===3?.25:1;
    let raf=0;let playbackRaf=0;let disposed=false;let reversing=false;
    const query=new URLSearchParams(location.search).get("p");
    const initial=query!==null&&Number.isFinite(Number(query))?clamp(Number(query)):null;
    const seek=()=>{if(disposed||advancing.current||v.seeking||!Number.isFinite(v.duration)||v.readyState<1)return;const target=Math.min(Math.max(0,v.duration-.05),desired.current*v.duration);if(Math.abs(v.currentTime-target)>.03)v.currentTime=target;};
    const scroll=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{if(autoplay||advancing.current)return;const total=el.offsetHeight-innerHeight;const progress=total>0?clamp(-el.getBoundingClientRect().top/total):1;desired.current=progress;setP(progress);if(!reduced)seek();});};
    const ready=()=>{
      if(autoplay){if(initial!==null){desired.current=initial;setP(initial);seek();setPaused(true);}else if(reduced){setP(1);desired.current=1;seek();setPaused(true);}else{v.play().then(()=>setPaused(false)).catch(()=>{setPaused(true);setP(1);});}}
      else{if(initial!==null)window.scrollTo(0,el.offsetTop+initial*(el.offsetHeight-innerHeight));scroll();}
    };
    const stop=()=>{if(!advancing.current)return;advancing.current=false;reversing=false;cancelAnimationFrame(playbackRaf);v.pause();setPlaying(false);window.dispatchEvent(new CustomEvent("elkano:play-state",{detail:false}));};
    const syncPlayback=()=>{
      if(disposed||!advancing.current)return;
      if(Number.isFinite(v.duration)&&v.duration>0){const progress=clamp(v.currentTime/v.duration);desired.current=progress;setP(progress);window.scrollTo({top:el.offsetTop+progress*(el.offsetHeight-innerHeight),behavior:"instant"});}
      playbackRaf=requestAnimationFrame(syncPlayback);
    };
    const advance=()=>{
      if(!nextHref)return;if(advancing.current){if(!reversing)return;stop();}
      if(reduced||v.error||v.ended){router.push(nextHref);return;}
      advancing.current=true;setPlaying(true);cancelAnimationFrame(raf);
      v.play().then(()=>{if(!disposed&&advancing.current)syncPlayback();}).catch(()=>{stop();setError(true);});
    };
    const rewind=()=>{
      stop();if(!Number.isFinite(v.duration))return;
      v.pause();advancing.current=true;reversing=true;setPlaying(true);
      window.dispatchEvent(new CustomEvent("elkano:play-state",{detail:true}));
      const start=performance.now(),from=v.currentTime;
      const top=el.offsetTop,distance=Math.max(0,el.offsetHeight-innerHeight);
      const frame=(now:number)=>{
        if(disposed||!advancing.current)return;
        const target=reduced?0:Math.max(0,from-(now-start)*v.playbackRate/1000);
        const progress=clamp(target/v.duration);desired.current=progress;setP(progress);
        if(!v.seeking)v.currentTime=target;
        window.scrollTo({top:top+progress*distance,behavior:"instant"});
        if(target<=0){stop();v.currentTime=0;window.dispatchEvent(new CustomEvent("elkano:play-state",{detail:false}));return;}
        playbackRaf=requestAnimationFrame(frame);
      };
      playbackRaf=requestAnimationFrame(frame);
    };
    const escape=(e:KeyboardEvent)=>{if(e.key==="Escape")stop();};
    const notify=()=>window.dispatchEvent(new CustomEvent("elkano:play-state",{detail:reversing||(!v.paused&&!v.ended)}));
    const toggle=()=>{if(advancing.current){stop();return;}if(!autoplay){advance();return;}if(!v.paused){v.pause();return;}if(v.ended){v.currentTime=0;setP(0);}v.play().catch(()=>setError(true));};
    const ended=()=>{setP(1);setPaused(true);if(advancing.current&&nextHref){cancelAnimationFrame(playbackRaf);if(!disposed)router.push(nextHref);}};
    const time=()=>{if(autoplay&&Number.isFinite(v.duration)&&!v.paused)setP(clamp(v.currentTime/v.duration));};
    // Only scroll-driven scenes coalesce seeks. Autoplay must never seek back to zero.
    v.addEventListener("loadedmetadata",ready);if(!autoplay)v.addEventListener("seeked",seek);v.addEventListener("timeupdate",time);v.addEventListener("ended",ended);
    window.addEventListener("scroll",scroll,{passive:true});window.addEventListener("resize",scroll);
    window.addEventListener("elkano:advance",advance);window.addEventListener("elkano:rewind",rewind);window.addEventListener("wheel",stop,{passive:true});window.addEventListener("touchstart",stop,{passive:true});window.addEventListener("keydown",escape);
    window.addEventListener("elkano:toggle-play",toggle);v.addEventListener("play",notify);v.addEventListener("pause",notify);v.addEventListener("ended",notify);
    if(v.readyState>=1)ready();else scroll();
    return()=>{disposed=true;advancing.current=false;cancelAnimationFrame(raf);cancelAnimationFrame(playbackRaf);v.pause();v.removeEventListener("loadedmetadata",ready);v.removeEventListener("seeked",seek);v.removeEventListener("timeupdate",time);v.removeEventListener("ended",ended);window.removeEventListener("scroll",scroll);window.removeEventListener("resize",scroll);window.removeEventListener("elkano:advance",advance);window.removeEventListener("elkano:rewind",rewind);window.removeEventListener("wheel",stop);window.removeEventListener("touchstart",stop);window.removeEventListener("keydown",escape);window.removeEventListener("elkano:toggle-play",toggle);v.removeEventListener("play",notify);v.removeEventListener("pause",notify);v.removeEventListener("ended",notify);};
  },[autoplay,reduced,nextHref,router]);
  return <div ref={track} className={`scene-track scene-number-${number}`} style={{height:`${autoplay?100:media.height}svh`}}>
    <section className="scene-stage" aria-label={media.title}>
      {media.still?<img className="scene-video" src={media.still} alt={`Plano de ${media.title}`} onError={()=>setError(true)}/>
        :<video ref={video} className="scene-video" src={media.video} poster={media.poster} preload="auto" muted playsInline onError={()=>setError(true)} aria-label={`Plano de ${media.title}`}/>}
      <div className="scene-shade"/>
      {number===1&&<>
        <Layer p={Math.max(.05,p)} to={.46} position="right"><div className="story-intro-card"><div className="intro-identity"><img src="/images/elkano-head.png" alt="Rostro de Juan Sebastián Elcano" width="1254" height="1254"/><h1>Elkano</h1></div><p>Luken, Nagore, Markos, David y Xuban y formamos el equipo Elkano. Nos subimos al barco de Embat.</p></div></Layer>
        <Layer p={p} from={.48} position="right"><div className="story-intro-card"><p className="scene-eyebrow">POR QUÉ ESTE TRACK</p><h1>El dinero<br/><em>deja rastro.</em></h1><p>Elegimos este track porque el dinero deja rastro y casi nadie lo lee. Embat ve el de 400 empresas cada día. Nos ha dado los datos de 1.286 para probar que podemos detectar lo que ocurre antes de que sea evidente.</p></div></Layer>
      </>}
      {number===3&&<SkyStory p={p} reduced={reduced}/>}
      {number===8&&<Layer p={p} from={.38} position="right"><div className="story-overlay-placeholder"><p className="scene-eyebrow">DOS EMPRESAS</p><h2>Cada barco es una empresa.</h2><div className="company-case-placeholder"><h3>Empresa A</h3><p>Diagnóstico y producto recomendado pendientes.</p></div><div className="company-case-placeholder"><h3>Empresa B</h3><p>Diagnóstico y producto recomendado pendientes.</p></div></div></Layer>}
      {number===5&&<><Layer p={Math.max(.05,p)} to={.54} position="right"><p className="scene-eyebrow">QUIÉN GANA CON ESTO</p><div className="scene-product"><h2>La empresa</h2><p>Gana interés que hoy no gana, deja de pagar intereses por dinero que ya tiene y evita el descubierto de julio.</p></div><div className="scene-product"><h2>Embat</h2><p>Dos módulos nuevos sobre 400 clientes, comisión por cada colocación, y una razón para que el financiero entre cada día.</p></div></Layer><Layer p={p} from={.52}><p className="scene-eyebrow">SOLO EN ESTE DATASET</p><div className="scene-metrics"><div><strong>535 M€</strong><p>parados en 312 empresas</p></div><div><strong>85 M€</strong><p>neteables hoy</p></div><div><strong>182</strong><p>empresas avisadas antes del impago con cuatro meses de antelación</p></div></div></Layer></>}
      {number===6&&<ClosingCopy/>}
      {error&&<p className="scene-media-error">No se ha podido cargar el vídeo. Puedes continuar con la presentación.</p>}
      <div className="scene-progress" role="progressbar" aria-label="Recorrido de la escena" aria-valuenow={Math.round(p*100)} aria-valuemin={0} aria-valuemax={100}><div style={{transform:`scaleX(${p})`}}/></div>
    </section>
  </div>;
}
