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
const easeOut=(t:number)=>1-Math.pow(1-t,3);
/** 1 dentro de [a,b] con fundidos de anchura f; b>=1 no funde al salir. */
const win=(p:number,a:number,b:number,f=.03)=>clamp((p-a)/f)*(b>=1?1:clamp((b-p)/f));
/** Capa activa en el estado i (1..4). */
const on=(p:number,i:number)=>win(p,STATES[i-1],STATES[i]);
const st=(i:number)=>STATES[i-1];
const inSky=(x:number,y:number)=>y<170||x>640||(x>560&&y<330);

type Star={x:number;y:number;m?:string;side?:"l"|"r"};
type Constellation={name:string;label:[number,number];stars:Star[];edges:[number,number][]};
const CONSTELLATIONS:Constellation[]=[
  {name:"LIQUIDEZ",label:[755,388],stars:[{x:680,y:290,m:"Saldo mínimo",side:"l"},{x:760,y:240,m:"Días en negativo"},{x:830,y:300,m:"Meses de caja"},{x:770,y:345}],edges:[[0,1],[1,2],[2,3],[3,0]]},
  {name:"PAGOS",label:[985,240],stars:[{x:910,y:170,m:"DSO",side:"l"},{x:985,y:120,m:"Cobros vencidos"},{x:1060,y:165,m:"Retraso de pagos"},{x:1000,y:205}],edges:[[0,1],[1,2],[2,3],[3,0]]},
  {name:"GENERACIÓN DE CAJA",label:[1275,228],stars:[{x:1200,y:150,m:"Flujo neto",side:"l"},{x:1275,y:110,m:"Tendencia 3 meses"},{x:1345,y:140,m:"Volatilidad"},{x:1300,y:192}],edges:[[0,1],[1,2],[2,3],[3,0]]},
  {name:"DEUDA",label:[1490,358],stars:[{x:1440,y:270,m:"Uso de crédito",side:"l"},{x:1510,y:235},{x:1535,y:320,m:"Coste financiero",side:"l"}],edges:[[0,1],[1,2]]},
  {name:"CONCENTRACIÓN",label:[765,708],stars:[{x:700,y:600,m:"Principales clientes",side:"l"},{x:770,y:560},{x:820,y:630,m:"Contrapartes comunes"},{x:730,y:670}],edges:[[0,1],[1,2],[2,3],[3,0]]},
];
const centroid=(c:Constellation)=>({x:c.stars.reduce((s,q)=>s+q.x,0)/c.stars.length,y:c.stars.reduce((s,q)=>s+q.y,0)/c.stars.length});

/** Logo de Embat trazado del isotipo: chevrón izquierdo (dos triángulos) y triángulo derecho. Unidades relativas al centro. */
const LOGO={x:1100,y:560,s:3.1};
const LOGO_TRIS:[number,number][][]=[
  [[-42,-32],[18,-50],[-16,0]],
  [[-42,32],[18,50],[-16,0]],
  [[20,-52],[58,0],[20,52]],
];
const logoPt=([x,y]:[number,number])=>[LOGO.x+x*LOGO.s,LOGO.y+y*LOGO.s] as const;

function mulberry(seed:number){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
type Particle={x:number;y:number;ox:number;oy:number;cx:number;cy:number;r:number;a:number;ph:number;dx:number;dy:number;grouped:boolean};
type Streak={x:number;y:number;vx:number;vy:number;len:number;ph:number};
type LogoStar={x:number;y:number;r:number;ph:number;d:number};
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
  // Estrellitas del logo: relleno uniforme de cada triángulo más un reguero por las aristas.
  const logo:LogoStar[]=[];
  for(const tri of LOGO_TRIS){
    const [a,b,c]=tri.map(logoPt);const area=Math.abs((b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]))/2;
    for(let k=0;k<area/38;k++){let u=rnd(),v=rnd();if(u+v>1){u=1-u;v=1-v;}const x=a[0]+(b[0]-a[0])*u+(c[0]-a[0])*v,y=a[1]+(b[1]-a[1])*u+(c[1]-a[1])*v;logo.push({x,y,r:.6+rnd()*1.3,ph:rnd()*Math.PI*2,d:rnd()});}
    for(let e=0;e<3;e++){const p0=[a,b,c][e],p1=[a,b,c][(e+1)%3];const n=Math.hypot(p1[0]-p0[0],p1[1]-p0[1])/9;for(let k=0;k<=n;k++){const u=k/n;logo.push({x:p0[0]+(p1[0]-p0[0])*u,y:p0[1]+(p1[1]-p0[1])*u,r:1.1+rnd()*1.1,ph:rnd()*Math.PI*2,d:rnd()*.6});}}
  }
  return {ps,streaks,logo};
}

/** Partículas en canvas: miles de señales, nubes alrededor de cada dimensión, convergen en el score, y al final el logo. */
function Particles({pRef,reduced}:{pRef:{current:number};reduced:boolean}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext("2d");if(!ctx)return;
    const {ps,streaks,logo}=buildField();let raf=0;let last=-1;let w=0,h=0,dpr=1;
    const resize=()=>{dpr=Math.min(devicePixelRatio||1,2);w=canvas.clientWidth;h=canvas.clientHeight;canvas.width=w*dpr;canvas.height=h*dpr;last=-1;};
    const draw=(now:number)=>{
      raf=requestAnimationFrame(draw);
      const p=pRef.current;const t=reduced?0:now/1000;
      if(reduced&&p===last)return;last=p;
      const narrow=w/h<1.4,viewW=narrow?1040:W,viewX=narrow?560:0;
      const s=narrow?Math.min(w/viewW,h/H):Math.max(w/W,h/H),offx=(w-viewW*s)/2-viewX*s,offy=(h-H*s)/2;
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.setTransform(s*dpr,0,0,s*dpr,offx*dpr,offy*dpr);
      const t1=seg(p,1),order=ease(seg(p,2)),gather=ease(seg(p,3)),t4=seg(p,4),back=ease(clamp(t4*2));
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
        if(back>0){x+=(q.ox-x)*back;y+=(q.oy-y)*back;a+=(q.grouped?q.a*.7:q.a*.2)*back;}
        const tw=reduced?1:.75+.25*Math.sin(t*1.7+q.ph*3);
        ctx.fillStyle=`rgba(205,238,248,${clamp(a*born*tw)})`;ctx.beginPath();ctx.arc(x,y,q.r,0,6.283);ctx.fill();
      }
      // El logo: de repente, un montón de estrellitas encendiéndose casi a la vez.
      const burst=clamp(t4*4-.8);
      if(burst>0){
        for(const q of logo){
          const lit=easeOut(clamp((burst-q.d*.55)/.45));if(lit<=0)continue;
          const tw=reduced?1:.7+.3*Math.sin(t*2.3+q.ph*5);
          const flash=1+(1-lit)*1.6;
          ctx.fillStyle=`rgba(255,255,255,${clamp(lit*tw*.95)})`;ctx.beginPath();ctx.arc(q.x,q.y,q.r*flash,0,6.283);ctx.fill();
          if(q.r>1.4){ctx.fillStyle=`rgba(199,236,246,${clamp(lit*.25)})`;ctx.beginPath();ctx.arc(q.x,q.y,q.r*3.2,0,6.283);ctx.fill();}
        }
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
  const [narrow,setNarrow]=useState(false);
  useEffect(()=>{const query=matchMedia('(max-aspect-ratio: 7/5)');const update=()=>setNarrow(query.matches);update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
  const [hover,setHover]=useState<number|null>(null);
  const t1=seg(p,1),t2=seg(p,2),t3=seg(p,3),t4=seg(p,4);
  const advance=(e:React.MouseEvent)=>{
    if((e.target as HTMLElement).closest("a,button"))return;
    const track=(e.currentTarget as HTMLElement).closest(".scene-track") as HTMLElement|null;if(!track)return;
    const next=LANDINGS.find(s=>s>p+.01);if(next===undefined)return;
    window.scrollTo({top:track.offsetTop+next*(track.offsetHeight-innerHeight),behavior:reduced?"auto":"smooth"});
  };
  // Constelaciones: nacen en el estado 2, se atenúan mientras habla el score, vuelven suaves con el logo.
  const constA=Math.max(on(p,2),win(p,st(3),1,.06)*.22,t4*.5);
  const linksA=Math.max(win(p,st(3),1),t4*.6);
  const score=Math.round(78*ease(clamp(t3*2.2)));
  // En el cierre el score sube y deja el centro del cielo al logo.
  const lift=ease(clamp(t4*2.5));const sc=1-.45*lift;const sy=CORE.y-(CORE.y-250)*lift;
  const scoreA=win(p,st(3),1);
  const linkA=(i:number)=>clamp(linksA*Math.min(1,(t3*8-i*.6)));
  const logoEdges=clamp(t4*4-1.4);
  return <div className="sky-story" onClick={advance}>
    <Particles pRef={pRef} reduced={reduced}/>
    <svg viewBox={narrow?`560 0 1040 ${H}`:`0 0 ${W} ${H}`} preserveAspectRatio={narrow?"xMidYMid meet":"xMidYMid slice"} className="sky-svg" role="img" aria-label="Del ruido financiero a una señal predictiva">
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
        {CONSTELLATIONS.map((c,i)=>{const q=centroid(c);return <line key={c.name} x1={q.x} y1={q.y} x2={CORE.x} y2={sy} stroke="#c7ecf6" strokeOpacity=".45" strokeWidth=".7" pathLength={1} strokeDasharray={1} strokeDashoffset={1-linkA(i)}/>;})}
      </G>
      <G o={scoreA}>
        <g style={{transform:`translate(${CORE.x}px,${sy}px)`,transition:"transform .8s ease"}}>
          <g style={{transform:`scale(${sc})`,transition:"transform .8s ease"}}>
            <circle r={170} fill="url(#sky-core)" opacity={.55*clamp(t3*2)*(1-lift*.6)} style={{transition:"opacity .8s"}}/>
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

      {/* ESTADO 4, el logo de Embat en estrellas: las aristas se insinúan tras el estallido */}
      <G o={t4}>
        {LOGO_TRIS.map((tri,i)=><polygon key={i} points={tri.map(q=>logoPt(q).join(",")).join(" ")} fill="none" stroke="#dff4fa" strokeOpacity=".35" strokeWidth=".7" pathLength={1} strokeDasharray={1} strokeDashoffset={1-ease(logoEdges)}/>)}
      </G>
    </svg>
  </div>;
}
