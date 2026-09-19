"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Escena 3, del ruido financiero al score. Capa transparente sobre el vídeo del cielo.
 * Todo se dibuja en un lienzo virtual de 1600x900 que cubre el viewport igual que
 * el vídeo (cover), así los elementos quedan siempre sobre el mismo trozo de cielo.
 * El barco ocupa la esquina inferior izquierda y no se toca.
 * Cuatro estados por tramo de scroll: caos, dimensiones, score, logo de Embat en estrellas.
 * Click en el cielo salta al siguiente punto.
 */
const W=1600,H=900,CORE={x:1100,y:430};
export const STATES=[0,.2,.42,.68,1];
/** Puntos de aterrizaje del click: la pregunta del estado 1 y el 60% de cada estado, con el build-in ya terminado. */
const LANDINGS=[.12,...STATES.slice(1,-1).map((s,i)=>s+(STATES[i+2]-s)*.6)];
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const seg=(p:number,i:number)=>clamp((p-STATES[i-1])/(STATES[i]-STATES[i-1]));
const ease=(t:number)=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
/** 1 dentro de [a,b] con fundidos de anchura f; b>=1 no funde al salir. */
const win=(p:number,a:number,b:number,f=.03)=>clamp((p-a)/f)*(b>=1?1:clamp((b-p)/f));
/** Capa activa en el estado i (1..4). */
const on=(p:number,i:number)=>win(p,STATES[i-1],STATES[i]);
const st=(i:number)=>STATES[i-1];
const inSky=(x:number,y:number)=>y<170||x>640||(x>560&&y<330);

type Star={x:number;y:number;m?:string;side?:"l"|"r"};
type Constellation={name:string;label:[number,number];stars:Star[];edges:[number,number][]};
// Registered to the visible stars in estrellas-ref13.mp4. Checked across
// 40 video samples: these stars move less than one virtual pixel throughout.
const CONSTELLATIONS:Constellation[]=[
  {name:"LIQUIDEZ",label:[960,225],stars:[{x:919.4,y:139.4,m:"Saldo mínimo",side:"l"},{x:958.1,y:178.8,m:"Días en negativo"},{x:1012.8,y:164.5,m:"Meses de caja"},{x:1001.2,y:131.9}],edges:[[0,1],[1,2],[2,3],[3,0]]},
  {name:"PAGOS",label:[1160,325],stars:[{x:1096.9,y:202.5,m:"DSO",side:"l"},{x:1127.5,y:190.9,m:"Cobros vencidos"},{x:1238.3,y:189.6,m:"Retraso de pagos"},{x:1201.2,y:278.1}],edges:[[0,1],[1,2],[2,3],[3,0]]},
  {name:"GENERACIÓN DE CAJA",label:[1410,340],stars:[{x:1311.2,y:219.4,m:"Flujo neto",side:"l"},{x:1358.1,y:103.1,m:"Tendencia 3 meses"},{x:1426.2,y:129.4,m:"Volatilidad"},{x:1487.8,y:255.8}],edges:[[0,1],[1,2],[2,3],[3,0]]},
  {name:"DEUDA",label:[960,595],stars:[{x:910.6,y:436.9,m:"Uso de crédito",side:"l"},{x:925,y:497.5},{x:982.5,y:541.2,m:"Coste financiero",side:"l"}],edges:[[0,1],[1,2]]},
  {name:"CONCENTRACIÓN",label:[1360,665],stars:[{x:1251.9,y:506.9,m:"Principales clientes",side:"l"},{x:1288.8,y:506.9},{x:1431.4,y:561.4,m:"Contrapartes comunes",side:"l"},{x:1255,y:611.9}],edges:[[0,1],[1,2],[2,3],[3,0]]},
];
const centroid=(c:Constellation)=>({x:c.stars.reduce((s,q)=>s+q.x,0)/c.stars.length,y:c.stars.reduce((s,q)=>s+q.y,0)/c.stars.length});

/** Logo de Embat trazado del isotipo: chevrón izquierdo (dos triángulos) y triángulo derecho. Unidades relativas al centro. */
const LOGO={x:1100,y:430,s:4.2};
const LOGO_TRIS:[number,number][][]=[
  [[-42,-32],[18,-50],[-16,0]],
  [[-42,32],[18,50],[-16,0]],
  [[20,-52],[58,0],[20,52]],
];
const logoPt=([x,y]:[number,number])=>[LOGO.x+x*LOGO.s,LOGO.y+y*LOGO.s] as const;

function mulberry(seed:number){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
type Particle={x:number;y:number;ox:number;oy:number;cx:number;cy:number;r:number;a:number;ph:number;dx:number;dy:number;grouped:boolean};
type Streak={x:number;y:number;vx:number;vy:number;len:number;ph:number};
function buildField(){
  const rnd=mulberry(20260919);const ps:Particle[]=[];const cs=CONSTELLATIONS.map(centroid);
  while(ps.length<1500){
    const x=40+rnd()*1540,y=20+rnd()*780;if(!inSky(x,y))continue;
    const grouped=rnd()<.42;let ox=x,oy=y;
    if(grouped){const c=cs[Math.floor(rnd()*cs.length)];const ang=rnd()*Math.PI*2,rad=25+Math.sqrt(rnd())*105;ox=c.x+Math.cos(ang)*rad;oy=c.y+Math.sin(ang)*rad*.8;}
    const ang=rnd()*Math.PI*2,rad=Math.sqrt(rnd())*46;
    ps.push({x,y,ox,oy,cx:CORE.x+Math.cos(ang)*rad,cy:CORE.y+Math.sin(ang)*rad,r:.5+rnd()*1.2,a:.25+rnd()*.6,ph:rnd()*Math.PI*2,dx:(rnd()-.5)*4,dy:(rnd()-.5)*4,grouped});
  }
  const streaks:Streak[]=[];
  while(streaks.length<48){const x=560+rnd()*1000,y=60+rnd()*680;if(!inSky(x,y))continue;const ang=rnd()*Math.PI*2,sp=8+rnd()*22;streaks.push({x,y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,len:24+rnd()*50,ph:rnd()*20});}
  return {ps,streaks};
}

/** Partículas en canvas: miles de señales, nubes alrededor de cada dimensión, convergen en el score y desaparecen antes del logo. */
function Particles({pRef,reduced}:{pRef:{current:number};reduced:boolean}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext("2d");if(!ctx)return;
    const {ps,streaks}=buildField();let raf=0;let last=-1;let w=0,h=0,dpr=1;
    const resize=()=>{dpr=Math.min(devicePixelRatio||1,2);w=canvas.clientWidth;h=canvas.clientHeight;canvas.width=w*dpr;canvas.height=h*dpr;last=-1;};
    const draw=(now:number)=>{
      raf=requestAnimationFrame(draw);
      const p=pRef.current;const t=reduced?0:now/1000;
      if(reduced&&p===last)return;last=p;
      const s=Math.max(w/W,h/H),offx=(w-W*s)/2,offy=(h-H*s)/2;
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.setTransform(s*dpr,0,0,s*dpr,offx*dpr,offy*dpr);
      const t1=seg(p,1),order=ease(seg(p,2)),gather=ease(seg(p,3));
      // Trayectorias: solo mientras reina el caos.
      const streakA=clamp(t1*3)*(1-order);
      if(streakA>0){ctx.lineWidth=.8;ctx.lineCap="round";for(const k of streaks){const q=((t*.06+k.ph)%1);const px=k.x+k.vx*q*6,py=k.y+k.vy*q*6;if(!inSky(px,py))continue;const L=Math.hypot(k.vx,k.vy);const x0=px-k.vx/L*k.len,y0=py-k.vy/L*k.len;const g=ctx.createLinearGradient(x0,y0,px,py);g.addColorStop(0,"rgba(190,235,245,0)");g.addColorStop(1,`rgba(190,235,245,${.35*streakA*Math.sin(q*Math.PI)})`);ctx.strokeStyle=g;ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(px,py);ctx.stroke();}}
      const appear=clamp(t1*2.2);
      for(let i=0;i<ps.length;i++){
        const q=ps[i];const born=clamp((appear*1500-i*.9)/60);if(born<=0)continue;
        const drift=(1-order);const jx=q.x+Math.sin(t*.4+q.ph)*q.dx*drift,jy=q.y+Math.cos(t*.3+q.ph)*q.dy*drift;
        let x=jx+(q.ox-jx)*order,y=jy+(q.oy-jy)*order;
        let a=q.a*(q.grouped?1:1-order*.8);
        x+=(q.cx-x)*gather;y+=(q.cy-y)*gather;a*=1-gather;
        const tw=reduced?1:.75+.25*Math.sin(t*1.7+q.ph*3);
        ctx.fillStyle=`rgba(205,238,248,${clamp(a*born*tw)})`;ctx.beginPath();ctx.arc(x,y,q.r,0,6.283);ctx.fill();
      }

    };
    resize();window.addEventListener("resize",resize);raf=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);};
  },[pRef,reduced]);
  return <canvas ref={ref} className="sky-canvas" aria-hidden/>;
}

const G=({o,children,style}:{o:number;children:ReactNode;style?:React.CSSProperties})=><g style={{opacity:o,transition:"opacity .8s ease",...style}} aria-hidden={o<.05}>{children}</g>;
const Label=({x,y,size=12,children,anchor="middle",cls="sky-sans",fill="#dff4fa",o=1}:{x:number;y:number;size?:number;children:ReactNode;anchor?:"start"|"middle"|"end";cls?:string;fill?:string;o?:number})=><text x={x} y={y} fontSize={size} textAnchor={anchor} className={cls} fill={fill} opacity={o}>{children}</text>;

export function SkyStory({p,reduced}:{p:number;reduced:boolean}){
  const pRef=useRef(p);pRef.current=p;
  const [hover,setHover]=useState<number|null>(null);
  const t1=seg(p,1),t2=seg(p,2),t3=seg(p,3),t4=seg(p,4);
  const advance=(e:React.MouseEvent)=>{
    if((e.target as HTMLElement).closest("a,button"))return;
    const track=(e.currentTarget as HTMLElement).closest(".scene-track") as HTMLElement|null;if(!track)return;
    const next=LANDINGS.find(s=>s>p+.01);if(next===undefined)return;
    window.scrollTo({top:track.offsetTop+next*(track.offsetHeight-innerHeight),behavior:reduced?"auto":"smooth"});
  };
  // Primero se apagan el score y las dimensiones; después se dibuja el logo.
  const fadeOut=1-ease(clamp(t4*4));
  const constA=Math.max(on(p,2),win(p,st(3),1,.06)*.22)*fadeOut;
  const linksA=win(p,st(3),1)*fadeOut;
  const score=Math.round(78*ease(clamp(t3*2.2)));
  const scoreA=win(p,st(3),1)*fadeOut;
  const linkA=(i:number)=>clamp(linksA*Math.min(1,(t3*8-i*.6)));
  const logoA=ease(clamp((t4-.25)/.25));
  const logoEdges=ease(clamp((t4-.28)/.42));
  return <div className="sky-story" onClick={advance}>
    <Particles pRef={pRef} reduced={reduced}/>
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="sky-svg" role="img" aria-label="Del ruido financiero a una señal predictiva">
      <defs>
        <filter id="sky-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3"/></filter>
        <radialGradient id="sky-core"><stop offset="0" stopColor="#ffffff" stopOpacity=".95"/><stop offset=".35" stopColor="#c7ecf6" stopOpacity=".5"/><stop offset="1" stopColor="#c7ecf6" stopOpacity="0"/></radialGradient>
      </defs>

      {/* ESTADO 1, el caos */}
      <G o={clamp((st(2)-p)/.03)}>
        <Label x={CORE.x} y={405} size={62} cls="sky-serif" fill="#f5fbfd" o={clamp(t1*3)}>Millones de señales financieras.</Label>
        <Label x={CORE.x} y={452} size={15} cls="sky-sans sky-track" fill="#b8d9e3" o={clamp(t1*3-.6)}>Pagos, facturas, caja, crédito y retrasos</Label>
        <Label x={CORE.x} y={535} size={30} cls="sky-serif sky-italic" fill="#c7ecf6" o={clamp(t1*2.4-1.3)}>¿Cómo encontramos patrones entre tantos datos?</Label>
      </G>

      {/* ESTADO 2, cinco dimensiones */}
      <G o={constA}>
        {CONSTELLATIONS.map((c,i)=>{const ti=clamp(t2*8-i*.7);const hv=hover===i;return <g key={c.name} className="sky-constellation" style={{opacity:Math.max(ti,t4)}} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)}>
          {c.edges.map(([a,b])=><line key={a+"-"+b} x1={c.stars[a].x} y1={c.stars[a].y} x2={c.stars[b].x} y2={c.stars[b].y} stroke="#cfeaf3" strokeOpacity=".5" strokeWidth=".8" pathLength={1} strokeDasharray={1} strokeDashoffset={1-ease(ti)}/>)}
          {c.stars.map((s,k)=><g key={k}><circle cx={s.x} cy={s.y} r={7} fill="#c7ecf6" opacity=".35" filter="url(#sky-glow)"/><circle cx={s.x} cy={s.y} r={2.4} fill="#ffffff"/>
            {s.m&&<Label x={s.side==="l"?s.x-9:s.x+9} y={s.y+4} size={10.5} anchor={s.side==="l"?"end":"start"} fill="#a9cfdb" o={hv?1:.6}>{s.m}</Label>}</g>)}
          <Label x={c.label[0]} y={c.label[1]} size={11.5} cls="sky-sans sky-track">{c.name}</Label>
        </g>;})}
        <Label x={CORE.x} y={760} size={19} cls="sky-serif sky-italic" fill="#dff4fa" o={on(p,2)*clamp(t2*2-.5)}>Agrupamos las señales en dimensiones que podemos interpretar.</Label>
      </G>

      {/* ESTADO 3, las dimensiones convergen en un núcleo: el score */}
      <G o={linksA}>
        {CONSTELLATIONS.map((c,i)=>{const q=centroid(c);return <line key={c.name} x1={q.x} y1={q.y} x2={CORE.x} y2={CORE.y} stroke="#c7ecf6" strokeOpacity=".45" strokeWidth=".7" pathLength={1} strokeDasharray={1} strokeDashoffset={1-linkA(i)}/>;})}
      </G>
      <G o={scoreA}>
        <g style={{transform:`translate(${CORE.x}px,${CORE.y}px)`,transition:"none"}}>
          <g>
            <circle r={170} fill="url(#sky-core)" opacity={.55*clamp(t3*2)} style={{transition:"opacity .8s"}}/>
            <circle r={9} fill="#ffffff" opacity={clamp(t3*3)*(1-clamp(t3*3-1))} filter="url(#sky-glow)"/>
            <Label x={0} y={48} size={150} cls="sky-serif sky-num" fill="#ffffff" o={clamp(t3*4-.8)}>{score}</Label>
            <Label x={0} y={92} size={12.5} cls="sky-sans sky-track" fill="#c7ecf6" o={clamp(t3*4-1.4)}>SCORE DE SALUD FINANCIERA</Label>
            <Label x={0} y={118} size={11} cls="sky-sans" fill="#9fc7d4" o={clamp(t3*4-1.8)}>Ejemplo: 0 = alto riesgo, 100 = buena salud</Label>
          </g>
        </g>
      </G>
      <G o={on(p,3)*clamp(t3*4-1.8)}>
        <Label x={1330} y={410} size={10.5} cls="sky-sans sky-track" fill="#9fc7d4" anchor="start">DE</Label>
        {["millones de movimientos","decenas de métricas","evolución en el tiempo"].map((s,i)=><Label key={s} x={1330} y={434+i*22} size={14} fill="#dff4fa" anchor="start">{s}</Label>)}
        <Label x={1330} y={512} size={10.5} cls="sky-sans sky-track" fill="#9fc7d4" anchor="start">A</Label>
        <Label x={1330} y={536} size={15} cls="sky-serif sky-italic" fill="#ffffff" anchor="start">una señal para decidir</Label>
      </G>

      {/* ESTADO 4: una sola constelación, grande, con estrellas solo en los vértices. */}
      <G o={logoA} style={{transition:"none"}}>
        {LOGO_TRIS.map((tri,i)=><g key={i}>
          <polygon points={tri.map(q=>logoPt(q).join(",")).join(" ")} fill="none" stroke="#cfeaf3" strokeOpacity=".7" strokeWidth="1.2" pathLength={1} strokeDasharray={1} strokeDashoffset={1-logoEdges}/>
          {tri.map((q,k)=>{const [x,y]=logoPt(q);return <g key={k}>
            <circle cx={x} cy={y} r={9} fill="#c7ecf6" opacity=".35" filter="url(#sky-glow)"/>
            <circle cx={x} cy={y} r={3} fill="#ffffff"/>
          </g>;})}
        </g>)}
        <Label x={LOGO.x} y={735} size={30} cls="sky-serif" fill="#ffffff" o={ease(clamp((t4-.55)/.2))}>Un score unificado</Label>
        <Label x={LOGO.x} y={776} size={30} cls="sky-serif" fill="#ffffff" o={ease(clamp((t4-.55)/.2))}>con el cual tomar decisiones.</Label>
      </G>
    </svg>
  </div>;
}
