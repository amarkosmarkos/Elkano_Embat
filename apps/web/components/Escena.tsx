"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { presentation, presentationHref, sceneMedia } from "@/lib/presentation";

type WindowData={key:string;title:string;value:string;detail:string};
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
function Layer({p,from=0,to=1,position="center",children}:{p:number;from?:number;to?:number;position?:string;children:ReactNode}) {
  const alpha=clamp((p-from)/.045)*(to===1?1:clamp((to-p)/.045));
  return <div className={`scene-layer scene-${position}`} aria-hidden={alpha===0} style={{opacity:alpha,transform:`translateY(${(1-alpha)*14}px)`,pointerEvents:alpha>.5?"auto":"none"}}>{children}</div>;
}
function Constellation({p}:{p:number}) {
  const points=[[310,70,"Pago","−22"],[510,175,"Liquidez","+11"],[440,360,"Caja","+11"],[170,360,"Deuda","−1"],[100,175,"Concentración","−27"]] as const;
  return <div className="constellation"><svg viewBox="0 0 620 450" role="img" aria-label="Cinco dimensiones: Pago menos 22, Liquidez más 11, Caja más 11, Deuda menos 1 y Concentración menos 27. Score 45.">
    <polygon points={points.map(([x,y])=>`${x},${y}`).join(" ")} fill="none" stroke="#a2cfca" strokeWidth="1" style={{opacity:clamp((p-.3)/.2)*.6}}/>
    {points.map(([x,y,label,value],i)=><g key={label} style={{opacity:clamp((p-i*.075)/.07)}}><circle cx={x} cy={y} r="15" fill="#a8e5ca" opacity=".08"/><circle cx={x} cy={y} r="3.5" fill="#daffed"/><text x={x} y={y-23} textAnchor="middle" fill="#fff" fontSize="16">{label}</text><text x={x} y={y+30} textAnchor="middle" fill="#8ee4bc" fontSize="18" style={{opacity:clamp((p-.5)/.08)}}>{value}</text></g>)}
    <g style={{opacity:clamp((p-.5)/.09)}}><text x="310" y="238" textAnchor="middle" fill="white" fontSize="100" fontFamily="Georgia,serif">45</text><text x="310" y="273" textAnchor="middle" fill="#cfdbdf" fontSize="12" letterSpacing="1">COMP_0945 · AGOSTO 2026</text></g>
  </svg></div>;
}

export function Escena({number,windows=[]}:{number:number;windows?:WindowData[]}) {
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
  const index=presentation.findIndex(([route])=>route===`/escena/${number}`);const next=presentation[index+1];
  return <div ref={track} className={`scene-track scene-number-${number}`} style={{height:`${autoplay?100:media.height}svh`}}>
    <section className="scene-stage" aria-label={media.title}>
      <video ref={video} className="scene-video" src={media.video} poster={media.poster} preload="auto" muted playsInline onError={()=>setError(true)} aria-label={`Plano de ${media.title}`}/>
      <div className="scene-shade"/>
      <header className="scene-masthead"><Link href="/escena/1/" className="scene-wordmark">ELKANO<span>✧</span></Link><span>HACKSPAIN 2026 · X RAY · EMBAT</span><span className="scene-chapter">{String(number).padStart(2,"0")} / {media.title}</span></header>
      {number===1&&<>
        <div className="scene-opening"><p className="scene-eyebrow">EL RASTRO MARCA EL RUMBO</p><h1>Un score que lee<br/>el rastro del dinero<br/><em>antes que nadie.</em></h1></div>
        <Layer p={Math.max(.05,p)} to={.30} position="bottom-left"><p>Somos Luken, Nagore, Markos, David y Xuban. Nos hemos subido al barco de Embat para navegar este mar: 1.286 empresas en 250 grupos, 24 meses, 2.556.437 movimientos y 897.894 facturas.</p></Layer>
        <aside className="scene-windows" aria-label="Siete ventanas a los datos">{windows.map((w,i)=>{const a=clamp((p-(.18+i*.67/7))/.055);return <article key={w.key} className="scene-window" aria-hidden={!a} style={{opacity:a,transform:`translateX(${(1-a)*20}px)`}}><div><span>{String(i+1).padStart(2,"0")} · {w.title}</span><strong>{w.value}</strong></div><p>{w.detail}</p></article>;})}</aside>
      </>}
      {number===2&&<><div className="scene-curtain" style={{opacity:clamp((p-.56)/.1)*.85}}/><Layer p={p} from={.6}><p className="scene-eyebrow">Nos paramos a pensar</p><h1>Siete ventanas,<br/>siete verdades parciales.</h1><p className="scene-lead">Ningún financiero puede mirar las siete cada mañana.</p><p className="scene-question">¿Y si todo esto cupiera en un solo número?</p></Layer></>}
      {number===3&&<><Constellation p={p}/><Layer p={p} from={.8} position="bottom-left"><h2>Una empresa, un número,<br/>cinco razones.</h2><p>Se calcula cada mes y lo importante no es el nivel sino la dirección: en febrero sacaba 72.</p></Layer></>}
      {number===4&&<><Layer p={Math.max(.05,p)} to={.32} position="left"><p className="scene-eyebrow">DEL DIAGNÓSTICO A LA DECISIÓN</p><h1>El score es el motor.<br/><em>Esto es lo que va encima.</em></h1></Layer><div className="scene-products">{[
        ['Colocación de excedentes','Cuánto es seguro inmovilizar y a qué plazo, y Embat lo ejecuta'],
        ['Cash pooling automático','La filial sobrada presta a la que necesita, con límite por score'],
        ['Monitor','Levanta la mano solo cuando una empresa se mueve de verdad'],
      ].map(([title,detail],i)=>{const a=clamp((p-(.3+i*.2))/.09);return <div key={title} className="scene-product" aria-hidden={!a} style={{opacity:a,transform:`translateY(${(1-a)*20}px)`}}><span>0{i+1}</span><h2>{title}</h2><p>{detail}</p></div>;})}</div></>}
      {number===5&&<><Layer p={Math.max(.05,p)} to={.54} position="right"><p className="scene-eyebrow">QUIÉN GANA CON ESTO</p><div className="scene-product"><h2>La empresa</h2><p>Gana interés que hoy no gana, deja de pagar intereses por dinero que ya tiene y evita el descubierto de julio.</p></div><div className="scene-product"><h2>Embat</h2><p>Dos módulos nuevos sobre 400 clientes, comisión por cada colocación, y una razón para que el financiero entre cada día.</p></div></Layer><Layer p={p} from={.52}><p className="scene-eyebrow">SOLO EN ESTE DATASET</p><div className="scene-metrics"><div><strong>535 M€</strong><p>parados en 312 empresas</p></div><div><strong>85 M€</strong><p>neteables hoy</p></div><div><strong>182</strong><p>empresas avisadas antes del impago con cuatro meses de antelación</p></div></div></Layer></>}
      {number===6&&<Layer p={p} from={.5}><p className="scene-eyebrow">EL VIAJE NO TERMINA AQUÍ</p><h1 className="scene-finale">Elkano</h1><p className="scene-lead">Agicap vende estas decisiones como módulos sueltos, sin score. Embat las tendría sobre un número que lee el rastro antes que nadie.</p><p className="scene-credits">Luken · Nagore · Markos · David · Xuban</p><p className="scene-eyebrow">HackSpain 2026 · Reto X Ray de Embat</p></Layer>}
      <div className="scene-bottom"><span>{autoplay?"EL VIAJE CONTINÚA":p<.94?"DESLIZA PARA AVANZAR":"SIGUIENTE CAPÍTULO"}</span>{!autoplay&&<span>{Math.round(p*100)}%</span>}
        {next&&p>.90&&<Link className="scene-next" href={presentationHref(next[0])}>Siguiente · {next[1]} <span>›</span></Link>}
        {autoplay&&<button className="scene-next" onClick={()=>{const v=video.current;if(!v)return;if(v.ended||p>=1){v.currentTime=0;setP(0);}if(v.paused){v.play().then(()=>setPaused(false)).catch(()=>setPaused(true));}else{v.pause();setPaused(true);}}}>{paused?"Reproducir":"Pausar"}</button>}
      </div>
      {error&&<p className="scene-media-error">No se ha podido cargar el vídeo. Puedes continuar con la presentación.</p>}
      <div className="scene-progress" role="progressbar" aria-label="Recorrido de la escena" aria-valuenow={Math.round(p*100)} aria-valuemin={0} aria-valuemax={100}><div style={{transform:`scaleX(${p})`}}/></div>
    </section>
  </div>;
}
