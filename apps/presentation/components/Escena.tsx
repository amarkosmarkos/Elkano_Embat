"use client";
import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { platformUrl, presentation, presentationHref, sceneMedia, sectionLabel } from "@/lib/presentation";
import { SkyStory } from "@/components/SkyStory";
import { CompanyBoat } from "@/components/CompanyBoat";
import { PresentationIcon } from "@/components/PresentationIcons";
import { easing, keyframe } from "@/lib/easing";

type WindowData={key:string;title:string;value:string;detail:string};
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
// Layers ease in and out (Easy Ease) over a .045 window of the clip's progress.
function Layer({p,from=0,to=1,position="center",children}:{p:number;from?:number;to?:number;position?:string;children:ReactNode}) {
  const alpha=keyframe(p,from,from+.045)*(to===1?1:1-keyframe(p,to-.045,to));
  return <div className={`scene-layer scene-${position}`} aria-hidden={alpha===0} style={{opacity:alpha,transform:`translateY(${(1-alpha)*14}px)`,pointerEvents:alpha>.5?"auto":"none"}}>{children}</div>;
}
// Escena 4. Keyframes on the clip's progress: PRODUCTOS comes in at the start and stays; when the chest is open the vignette
// closes in (0.44 to 0.60) and one callout per scroll is drawn (0.50 onwards, staggered), aligned with the three rolls of the
// freeze frame (measured on a 16:9 frame); then everything fades to navy while leaving for the next slide.
const productNames=presentation.filter(([route])=>route.startsWith("/producto")).map(([,title])=>title);
const scrolls=[{y:33,x:66},{y:41,x:68},{y:50,x:66}]; // Centre height and right end of each roll, in % of the stage.
function ChestReveal({p,leaving,fadeDelay}:{p:number;leaving:boolean;fadeDelay:number}) {
  const dim=keyframe(p,.44,.60);
  const title=keyframe(p,.02,.12,easing.easeOut);
  return <>
    <div className="scene-dim scene-vignette" style={{opacity:dim}}/>
    <div className="scene-dim" style={{opacity:leaving?1:0,transition:leaving?`opacity 1.1s cubic-bezier(.55,0,1,.45) ${fadeDelay}ms`:"none"}}/>
    <div className="scene-layer scene-center" aria-hidden={title===0} style={{opacity:title,transform:`translateY(${(1-title)*24}px)`}}>
      <h1 className="scene-section-title" style={{letterSpacing:`${.18-title*.12}em`}}>PRODUCTOS</h1>
    </div>
    <ol className="chest-callouts" aria-label="Los tres productos">
      {productNames.map((name,i)=>{
        const a=keyframe(p,.50+i*.035,.60+i*.035,easing.easeOut);
        const roll=scrolls[i]??scrolls[scrolls.length-1];
        return <li key={name} style={{top:`${roll.y}%`,left:`${roll.x+1}%`,opacity:a}} aria-hidden={a===0}>
          <span className="chest-leader" style={{transform:`scaleX(${a})`}}/>
          <span className="chest-label" style={{transform:`translateX(${(1-a)*18}px)`}}><span>{i+1}</span>{name}</span>
        </li>;
      })}
    </ol>
  </>;
}
// Static closing copy: visible in the initial HTML, independent of video state.
const ClosingCopy=memo(function ClosingCopy(){
  return <div className="scene-layer scene-center closing-copy">
    <h1 className="story-thanks">Gracias por escuchar.</h1>
    <p className="scene-credits">Luken, Nagore, Markos, David y Xuban</p>
    <p className="scene-eyebrow">HackSpain 2026, Embat</p>
    <div className="closing-platform"><a href={platformUrl} target="_blank" rel="noopener" className="closing-platform-button">Ir a la plataforma<PresentationIcon name="arrowRight"/></a></div>
  </div>;
});

export function Escena({number}:{number:number;windows?:WindowData[]}) {
  const router=useRouter();
  const index=presentation.findIndex(([route])=>route===`/escena/${number}`);const next=index>=0?presentation[index+1]:undefined;
  const nextHref=next?presentationHref(next[0]):null;
  const media=sceneMedia[number];const track=useRef<HTMLDivElement>(null);const video=useRef<HTMLVideoElement>(null);
  const desired=useRef(0);const [p,setP]=useState(0);const [reduced,setReduced]=useState(false);const [error,setError]=useState(false);
  const [leaving,setLeaving]=useState(false); // Fade to navy during the hold before an automatic advance.
  const closing=number===6;
  const end=media.cut??1; // Fraction of the clip that is actually shown.
  useEffect(()=>{
    const mq=window.matchMedia("(prefers-reduced-motion: reduce)");setReduced(mq.matches);
    const change=()=>setReduced(mq.matches);mq.addEventListener("change",change);return()=>mq.removeEventListener("change",change);
  },[]);
  useEffect(()=>{
    const el=track.current,v=video.current;if(!el||!v)return;
    const baseRate=number===3?.25:1;v.playbackRate=baseRate;
    let raf=0,hold=0,disposed=false,reversing=false,continueToNext=false;
    let top=el.offsetTop,distance=Math.max(0,el.offsetHeight-innerHeight);
    const query=new URLSearchParams(location.search).get("p");
    const initial=query!==null&&Number.isFinite(Number(query))?clamp(Number(query)):null;
    const notify=()=>window.dispatchEvent(new CustomEvent("elkano:play-state",{detail:reversing||(!v.paused&&!v.ended)}));
    const progress=(value:number,moveScroll=false)=>{
      value=Math.min(value,end);desired.current=value;setP(value);
      if(moveScroll&&distance>0)window.scrollTo({top:top+value*distance,behavior:"instant"});
    };
    const seek=()=>{
      if(disposed||!v.paused||reversing||v.seeking||!Number.isFinite(v.duration)||v.readyState<1)return;
      const target=Math.min(Math.max(0,v.duration-.05),desired.current*v.duration);
      if(Math.abs(v.currentTime-target)>.03)v.currentTime=target;
    };
    // Reaching the cut counts as the end of the clip: hold the frame, then advance if asked to.
    const reachedCut=()=>{
      cancelAnimationFrame(raf);v.pause();progress(end,true);notify();
      const go=continueToNext||media.autoAdvance;continueToNext=false;
      if(go&&nextHref&&!disposed){
        if(media.autoAdvance)setLeaving(true);
        hold=window.setTimeout(()=>{if(!disposed)router.push(nextHref);},media.autoAdvance?(media.hold??1400):0);
      }
    };
    const sync=()=>{
      if(disposed||v.paused||reversing)return;
      if(Number.isFinite(v.duration)&&v.duration>0){
        const value=clamp(v.currentTime/v.duration);
        if(end<1&&value>=end){reachedCut();return;}
        // Speed ramp into the cut: the last 12 % of the shown clip decelerates from 1x to 0.12x, so the freeze reads as a slow stop.
        if(end<1)v.playbackRate=baseRate*(1-.88*keyframe(value,end-.12,end));
        progress(value,true);
      }
      raf=requestAnimationFrame(sync);
    };
    const stop=()=>{continueToNext=false;reversing=false;cancelAnimationFrame(raf);clearTimeout(hold);setLeaving(false);v.pause();notify();};
    const play=()=>{cancelAnimationFrame(raf);notify();if(!reversing)raf=requestAnimationFrame(sync);};
    const pause=()=>{if(!reversing)cancelAnimationFrame(raf);notify();};
    const start=()=>{if(desired.current<end-.12)v.playbackRate=baseRate;v.play().catch(()=>{if(!disposed)notify();});};
    const ready=()=>{
      if(disposed)return;
      if(initial!==null){v.pause();progress(initial,true);seek();}
      else if(reduced){v.pause();progress(closing||end<1?end:0);seek();}
      else{
        // Every video starts on entry, from the first frame: reset any inherited scroll position or media time. Only an explicit › advances slides.
        progress(0,true);if(v.currentTime>0)v.currentTime=0;
        start();
      }
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
      if(reduced||v.error||v.ended||(end<1&&desired.current>=end)){if(nextHref)router.push(nextHref);return;}
      if(reversing)stop();continueToNext=!!nextHref;start();
    };
    const rewind=()=>{
      stop();if(!Number.isFinite(v.duration))return;
      reversing=true;notify();const began=performance.now(),from=v.currentTime;
      const frame=(now:number)=>{
        if(disposed||!reversing)return;
        const target=reduced?0:Math.max(0,from-(now-began)*baseRate/1000);
        progress(clamp(target/v.duration),true);if(!v.seeking)v.currentTime=target;
        if(target<=0){stop();v.currentTime=0;return;}
        raf=requestAnimationFrame(frame);
      };
      raf=requestAnimationFrame(frame);
    };
    const toggle=()=>{
      if(reversing||!v.paused){stop();return;}
      if(v.ended||(end<1&&desired.current>=end)){v.currentTime=0;progress(0,true);v.playbackRate=baseRate;}
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
      disposed=true;cancelAnimationFrame(raf);clearTimeout(hold);v.pause();
      v.removeEventListener("loadedmetadata",ready);v.removeEventListener("seeked",seek);
      v.removeEventListener("play",play);v.removeEventListener("pause",pause);v.removeEventListener("ended",ended);
      window.removeEventListener("scroll",scroll);window.removeEventListener("resize",resize);
      window.removeEventListener("elkano:advance",advance);window.removeEventListener("elkano:rewind",rewind);
      window.removeEventListener("elkano:toggle-play",toggle);window.removeEventListener("elkano:pause",stop);
      window.removeEventListener("wheel",stop);window.removeEventListener("touchstart",stop);window.removeEventListener("keydown",escape);
    };
  },[number,closing,reduced,nextHref,router,end,media.autoAdvance]);

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
      {number===4&&<ChestReveal p={p} leaving={leaving} fadeDelay={Math.max(0,(media.hold??1400)-1100)}/>}
      {number===8&&<Layer p={p} from={.38} position="right"><div className="story-overlay-placeholder"><p className="scene-eyebrow">DOS EMPRESAS</p><h2>Cada barco es una empresa.</h2><div className="company-case-placeholder company-case-with-boat"><CompanyBoat company="a" compact/><div><h3>Atlas Motors</h3><p>Un mal mes. Recibe de su grupo y de la red.</p></div></div><div className="company-case-placeholder company-case-with-boat"><CompanyBoat company="b" compact/><div><h3>Harbor Foods</h3><p>Sana. Presta a la red y asegura sus cobros.</p></div></div></div></Layer>}
      {number===5&&<><Layer p={Math.max(.05,p)} to={.54} position="right"><p className="scene-eyebrow">QUIÉN GANA CON ESTO</p><div className="scene-product"><h2>La empresa</h2><p>Gana interés que hoy no gana, deja de pagar intereses por dinero que ya tiene y evita el descubierto de julio.</p></div><div className="scene-product"><h2>Embat</h2><p>Dos módulos nuevos sobre 400 clientes, comisión por cada colocación, y una razón para que el financiero entre cada día.</p></div></Layer><Layer p={p} from={.52}><p className="scene-eyebrow">SOLO EN ESTE DATASET</p><div className="scene-metrics"><div><strong>535 M€</strong><p>parados en 312 empresas</p></div><div><strong>85 M€</strong><p>neteables hoy</p></div><div><strong>182</strong><p>empresas avisadas antes del impago con cuatro meses de antelación</p></div></div></Layer></>}
      {number===6&&<ClosingCopy/>}
      {error&&<p className="scene-media-error">No se ha podido cargar el vídeo. Puedes continuar con la presentación.</p>}
      <div className="scene-progress" role="progressbar" aria-label="Recorrido de la escena" aria-valuenow={Math.round(p/end*100)} aria-valuemin={0} aria-valuemax={100}><div style={{transform:`scaleX(${p/end})`}}/></div>
    </section>
  </div>;
}
