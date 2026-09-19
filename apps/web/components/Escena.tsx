"use client";
import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { presentation, presentationHref, sceneMedia, sectionLabel } from "@/lib/presentation";
import { SkyStory } from "@/components/SkyStory";
import { CompanyBoat } from "@/components/CompanyBoat";
import { PresentationIcon } from "@/components/PresentationIcons";

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
    <p className="scene-eyebrow">HackSpain 2026, Embat</p>
    <div className="closing-platform"><Link href="/plataforma/" className="closing-platform-button closing-platform-invite">Entrar en la plataforma <span className="closing-platform-arrow" aria-hidden="true"><PresentationIcon name="arrowRight"/></span></Link></div>
  </div>;
});

export function Escena({number}:{number:number;windows?:WindowData[]}) {
  const router=useRouter();
  const index=presentation.findIndex(([route])=>route===`/escena/${number}`);const next=index>=0?presentation[index+1]:undefined;
  const nextHref=next?presentationHref(next[0]):null;
  const media=sceneMedia[number];const track=useRef<HTMLDivElement>(null);const video=useRef<HTMLVideoElement>(null);
  const desired=useRef(0);const [p,setP]=useState(0);const [reduced,setReduced]=useState(false);const [error,setError]=useState(false);
  const closing=number===6;
  useEffect(()=>{
    const mq=window.matchMedia("(prefers-reduced-motion: reduce)");setReduced(mq.matches);
    const change=()=>setReduced(mq.matches);mq.addEventListener("change",change);return()=>mq.removeEventListener("change",change);
  },[]);
  useEffect(()=>{
    const el=track.current,v=video.current;if(!el||!v)return;
    v.playbackRate=number===3?.25:1;
    let raf=0,disposed=false,reversing=false,continueToNext=false;
    let top=el.offsetTop,distance=Math.max(0,el.offsetHeight-innerHeight);
    const query=new URLSearchParams(location.search).get("p");
    const initial=query!==null&&Number.isFinite(Number(query))?clamp(Number(query)):null;
    const notify=()=>window.dispatchEvent(new CustomEvent("elkano:play-state",{detail:reversing||(!v.paused&&!v.ended)}));
    const progress=(value:number,moveScroll=false)=>{
      desired.current=value;setP(value);
      if(moveScroll&&distance>0)window.scrollTo({top:top+value*distance,behavior:"instant"});
    };
    const seek=()=>{
      if(disposed||!v.paused||reversing||v.seeking||!Number.isFinite(v.duration)||v.readyState<1)return;
      const target=Math.min(Math.max(0,v.duration-.05),desired.current*v.duration);
      if(Math.abs(v.currentTime-target)>.03)v.currentTime=target;
    };
    const sync=()=>{
      if(disposed||v.paused||reversing)return;
      if(Number.isFinite(v.duration)&&v.duration>0)progress(clamp(v.currentTime/v.duration),true);
      raf=requestAnimationFrame(sync);
    };
    const stop=()=>{continueToNext=false;reversing=false;cancelAnimationFrame(raf);v.pause();notify();};
    const play=()=>{cancelAnimationFrame(raf);notify();if(!reversing)raf=requestAnimationFrame(sync);};
    const pause=()=>{if(!reversing)cancelAnimationFrame(raf);notify();};
    const start=()=>v.play().catch(()=>{if(!disposed)notify();});
    const ready=()=>{
      if(disposed)return;
      if(initial!==null){v.pause();progress(initial,true);seek();}
      else if(reduced){v.pause();progress(closing?1:0);seek();}
      else start(); // Every video starts on entry; only an explicit › advances slides.
    };
    const scroll=()=>{
      if(!v.paused||reversing||distance<=0)return;
      const value=clamp((window.scrollY-top)/distance);
      // Ignore the last programmatic scroll when playback stops or reaches its end.
      if(Math.abs(value-desired.current)<.002)return;
      progress(value);seek();
    };
    const resize=()=>{top=el.offsetTop;distance=Math.max(0,el.offsetHeight-innerHeight);};
    const advance=()=>{
      if(reduced||v.error||v.ended){if(nextHref)router.push(nextHref);return;}
      if(reversing)stop();continueToNext=!!nextHref;start();
    };
    const rewind=()=>{
      stop();if(!Number.isFinite(v.duration))return;
      reversing=true;notify();const began=performance.now(),from=v.currentTime;
      const frame=(now:number)=>{
        if(disposed||!reversing)return;
        const target=reduced?0:Math.max(0,from-(now-began)*v.playbackRate/1000);
        progress(clamp(target/v.duration),true);if(!v.seeking)v.currentTime=target;
        if(target<=0){stop();v.currentTime=0;return;}
        raf=requestAnimationFrame(frame);
      };
      raf=requestAnimationFrame(frame);
    };
    const toggle=()=>{
      if(reversing||!v.paused){stop();return;}
      if(v.ended){v.currentTime=0;progress(0,true);}
      continueToNext=false;start();
    };
    const ended=()=>{
      cancelAnimationFrame(raf);progress(1,true);notify();
      if(continueToNext&&nextHref&&!disposed)router.push(nextHref);
      continueToNext=false;
    };
    const escape=(e:KeyboardEvent)=>{if(e.key==="Escape")stop();};
    v.addEventListener("loadedmetadata",ready);v.addEventListener("seeked",seek);
    v.addEventListener("play",play);v.addEventListener("pause",pause);v.addEventListener("ended",ended);
    window.addEventListener("scroll",scroll,{passive:true});window.addEventListener("resize",resize);
    window.addEventListener("elkano:advance",advance);window.addEventListener("elkano:rewind",rewind);
    window.addEventListener("elkano:toggle-play",toggle);window.addEventListener("elkano:pause",stop);
    window.addEventListener("wheel",stop,{passive:true});window.addEventListener("touchstart",stop,{passive:true});window.addEventListener("keydown",escape);
    if(v.readyState>=1)ready();
    return()=>{
      disposed=true;cancelAnimationFrame(raf);v.pause();
      v.removeEventListener("loadedmetadata",ready);v.removeEventListener("seeked",seek);
      v.removeEventListener("play",play);v.removeEventListener("pause",pause);v.removeEventListener("ended",ended);
      window.removeEventListener("scroll",scroll);window.removeEventListener("resize",resize);
      window.removeEventListener("elkano:advance",advance);window.removeEventListener("elkano:rewind",rewind);
      window.removeEventListener("elkano:toggle-play",toggle);window.removeEventListener("elkano:pause",stop);
      window.removeEventListener("wheel",stop);window.removeEventListener("touchstart",stop);window.removeEventListener("keydown",escape);
    };
  },[number,closing,reduced,nextHref,router]);

  return <div ref={track} className={`scene-track scene-number-${number}`} style={{height:`${closing?100:media.height}svh`}}>
    <section className="scene-stage" aria-label={media.title}>
      {media.still?<img className="scene-video" src={media.still} alt={`Plano de ${media.title}`} onError={()=>setError(true)}/>
        :<video ref={video} className="scene-video" src={media.video} poster={media.poster} preload="auto" muted playsInline onError={()=>setError(true)} aria-label={`Plano de ${media.title}`}/>}
      <div className="scene-shade"/>
      {number===1&&<>
        <Layer p={Math.max(.05,p)} to={.46} position="right"><div className="story-intro-card"><div className="intro-identity"><img src="/images/elkano-head.png" alt="Rostro de Juan Sebastián Elcano" width="1254" height="1254"/><h1>Elkano</h1></div><p>Luken, Nagore, Markos, David y Xuban y formamos el equipo Elkano. Nos subimos al barco de Embat.</p></div></Layer>
        <Layer p={p} from={.48} position="right"><div className="story-intro-card intro-interest"><h1 className="intro-interest-title">El dinero deja rastro.</h1><p>Nos gustó la idea de entender qué le pasa a una empresa a través de sus movimientos. Y ver si con esos datos podíamos ayudar a tomar mejores decisiones.</p></div></Layer>
      </>}
      {number===3&&<SkyStory p={p} reduced={reduced}/>}
      {number===8&&<Layer p={p} from={.38} position="right"><div className="story-overlay-placeholder"><p className="scene-eyebrow">DOS EMPRESAS</p><h2>Cada barco es una empresa.</h2><div className="company-case-placeholder company-case-with-boat"><CompanyBoat company="a" compact/><div><h3>Empresa A</h3><p>Cash pooling y seguros de David.</p></div></div><div className="company-case-placeholder company-case-with-boat"><CompanyBoat company="b" compact/><div><h3>Empresa B</h3><p>Colocar el dinero extra.</p></div></div></div></Layer>}
      {number===5&&<><Layer p={Math.max(.05,p)} to={.54} position="right"><p className="scene-eyebrow">QUIÉN GANA CON ESTO</p><div className="scene-product"><h2>La empresa</h2><p>Gana interés que hoy no gana, deja de pagar intereses por dinero que ya tiene y evita el descubierto de julio.</p></div><div className="scene-product"><h2>Embat</h2><p>Dos módulos nuevos sobre 400 clientes, comisión por cada colocación, y una razón para que el financiero entre cada día.</p></div></Layer><Layer p={p} from={.52}><p className="scene-eyebrow">SOLO EN ESTE DATASET</p><div className="scene-metrics"><div><strong>535 M€</strong><p>parados en 312 empresas</p></div><div><strong>85 M€</strong><p>neteables hoy</p></div><div><strong>182</strong><p>empresas avisadas antes del impago con cuatro meses de antelación</p></div></div></Layer></>}
      {number===6&&<ClosingCopy/>}
      {error&&<p className="scene-media-error">No se ha podido cargar el vídeo. Puedes continuar con la presentación.</p>}
      <div className="scene-progress" role="progressbar" aria-label="Recorrido de la escena" aria-valuenow={Math.round(p*100)} aria-valuemin={0} aria-valuemax={100}><div style={{transform:`scaleX(${p})`}}/></div>
    </section>
  </div>;
}
