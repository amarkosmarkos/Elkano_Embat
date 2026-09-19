"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Escena 3, del ruido financiero al score. Capa transparente sobre el cielo.
 * Todo se dibuja en un lienzo virtual de 1600x900 que cubre el viewport igual que
 * la imagen de fondo (cover), así los elementos quedan siempre sobre el mismo trozo
 * de cielo. El barco ocupa la esquina inferior izquierda y no se toca.
 * Siete estados, uno por tramo de scroll; click en el cielo salta al siguiente.
 */
const W=1600,H=900,CORE={x:1100,y:430};
export const STATES=[0,.15,.30,.45,.58,.72,.85,1];
/** Puntos de aterrizaje del click: la pregunta del estado 1 y el 60% de cada estado, con el build-in ya terminado. */
const LANDINGS=[.09,...STATES.slice(1,-1).map((s,i)=>s+(STATES[i+2]-s)*.6)];
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const seg=(p:number,i:number)=>clamp((p-STATES[i-1])/(STATES[i]-STATES[i-1]));
const ease=(t:number)=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
/** 1 dentro de [a,b] con fundidos de anchura f; b>=1 no funde al salir. */
const win=(p:number,a:number,b:number,f=.03)=>clamp((p-a)/f)*(b>=1?1:clamp((b-p)/f));
/** Capa activa en el estado i (1..7). */
const on=(p:number,i:number)=>win(p,STATES[i-1],STATES[i]);
const st=(i:number)=>STATES[i-1];
const inSky=(x:number,y:number)=>y<170||x>640||(x>560&&y<330);

type Star={x:number;y:number;m?:string;side?:"l"|"r"};
type Constellation={name:string;label:[number,number];stars:Star[];edges:[number,number][]};
const CONSTELLATIONS:Constellation[]=[
  {name:"LIQUIDITY",label:[755,388],stars:[{x:680,y:290,m:"Min balance",side:"l"},{x:760,y:240,m:"Negative days"},{x:830,y:300,m:"Runway"},{x:770,y:345}],edges:[[0,1],[1,2],[2,3],[3,0]]},
  {name:"PAYMENTS",label:[985,240],stars:[{x:910,y:170,m:"DSO",side:"l"},{x:985,y:120,m:"Overdue receivables"},{x:1060,y:165,m:"Supplier delay"},{x:1000,y:205}],edges:[[0,1],[1,2],[2,3],[3,0]]},
  {name:"CASH GENERATION",label:[1275,228],stars:[{x:1200,y:150,m:"Net cash flow",side:"l"},{x:1275,y:110,m:"3M trend"},{x:1345,y:140,m:"Volatility"},{x:1300,y:192}],edges:[[0,1],[1,2],[2,3],[3,0]]},
  {name:"DEBT",label:[1490,358],stars:[{x:1440,y:270,m:"Credit usage",side:"l"},{x:1510,y:235},{x:1535,y:320,m:"Financial cost",side:"l"}],edges:[[0,1],[1,2]]},
  {name:"CONCENTRATION",label:[765,708],stars:[{x:700,y:600,m:"Top clients",side:"l"},{x:770,y:560},{x:820,y:630,m:"Shared counterparties"},{x:730,y:670}],edges:[[0,1],[1,2],[2,3],[3,0]]},
];
const centroid=(c:Constellation)=>({x:c.stars.reduce((s,q)=>s+q.x,0)/c.stars.length,y:c.stars.reduce((s,q)=>s+q.y,0)/c.stars.length});
const MONTHS=["JAN","FEB","MAR","APR","MAY","JUN","JUL"];
const TL={x0:920,x1:1460,y:560};
const mx=(i:number)=>TL.x0+(TL.x1-TL.x0)*i/6;
const GINI=[{v:"0.54",m:1},{v:"0.44",m:3},{v:"0.38",m:6}];

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

/** Partículas en canvas: miles de señales, luego nubes alrededor de cada dimensión, luego convergen en el score. */
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
      const t1=seg(p,1),order=ease(seg(p,2)),gather=ease(seg(p,3)),back=ease(seg(p,7));
      // Trayectorias: solo mientras reina el caos.
      const streakA=clamp(t1*3)*(1-order);
      if(streakA>0){ctx.lineWidth=.8;ctx.lineCap="round";for(const k of streaks){const q=((t*.06+k.ph)%1);const px=k.x+k.vx*q*6,py=k.y+k.vy*q*6;if(!inSky(px,py))continue;const g=ctx.createLinearGradient(px-k.vx/Math.hypot(k.vx,k.vy)*k.len,py-k.vy/Math.hypot(k.vx,k.vy)*k.len,px,py);g.addColorStop(0,"rgba(190,235,245,0)");g.addColorStop(1,`rgba(190,235,245,${.35*streakA*Math.sin(q*Math.PI)})`);ctx.strokeStyle=g;ctx.beginPath();ctx.moveTo(px-k.vx/Math.hypot(k.vx,k.vy)*k.len,py-k.vy/Math.hypot(k.vx,k.vy)*k.len);ctx.lineTo(px,py);ctx.stroke();}}
      const appear=clamp(t1*2.2);
      for(let i=0;i<ps.length;i++){
        const q=ps[i];const born=clamp((appear*1500-i*.9)/60);if(born<=0)continue;
        const drift=(1-order);const jx=q.x+Math.sin(t*.4+q.ph)*q.dx*drift,jy=q.y+Math.cos(t*.3+q.ph)*q.dy*drift;
        let x=jx+(q.ox-jx)*order,y=jy+(q.oy-jy)*order;
        let a=q.a*(q.grouped?1:1-order*.8);
        x+=(q.cx-x)*gather;y+=(q.cy-y)*gather;a*=1-gather;
        if(back>0){x+=(q.ox-x)*back;y+=(q.oy-y)*back;a+= (q.grouped?q.a*.9:q.a*.25)*back;}
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
  const t1=seg(p,1),t2=seg(p,2),t3=seg(p,3),t4=seg(p,4),t5=seg(p,5),t7=seg(p,7);
  const advance=(e:React.MouseEvent)=>{
    if((e.target as HTMLElement).closest("a,button"))return;
    const track=(e.currentTarget as HTMLElement).closest(".scene-track") as HTMLElement|null;if(!track)return;
    const next=LANDINGS.find(s=>s>p+.01);if(next===undefined)return;
    window.scrollTo({top:track.offsetTop+next*(track.offsetHeight-innerHeight),behavior:reduced?"auto":"smooth"});
  };
  // Constelaciones: nacen en el estado 2, se apagan mientras hablan el score y la validación, vuelven en el cierre.
  const constA=Math.max(on(p,2),win(p,st(3),st(7),.06)*.22,t7*.75);
  const linksA=Math.max(win(p,st(3),st(4)),win(p,st(4),st(7),.06)*.18,t7);
  const score=Math.round(78*ease(clamp(t3*2.2)));
  const small=win(p,st(4),st(7),.05);const big=Math.max(on(p,3),t7);
  const scoreA=Math.max(big,small);const sc=1-.45*small*(1-t7);const sy=CORE.y-(CORE.y-300)*small*(1-t7);
  const linkA=(i:number)=>clamp(linksA*Math.min(1,(t3*8-i*.6)));
  return <div className="sky-story" onClick={advance}>
    <Particles pRef={pRef} reduced={reduced}/>
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="sky-svg" role="img" aria-label="Del ruido financiero a una señal predictiva">
      <defs>
        <filter id="sky-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3"/></filter>
        <filter id="sky-glow-lg" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="14"/></filter>
        <radialGradient id="sky-core"><stop offset="0" stopColor="#ffffff" stopOpacity=".95"/><stop offset=".35" stopColor="#c7ecf6" stopOpacity=".5"/><stop offset="1" stopColor="#c7ecf6" stopOpacity="0"/></radialGradient>
      </defs>

      {/* ESTADO 1, el caos */}
      <G o={clamp((st(2)-p)/.03)}>
        <Label x={CORE.x} y={405} size={62} cls="sky-serif" fill="#f5fbfd" o={clamp(t1*3)}>Millions of financial signals.</Label>
        <Label x={CORE.x} y={452} size={15} cls="sky-sans sky-track" fill="#b8d9e3" o={clamp(t1*3-.6)}>Payments · Invoices · Cash movements · Credit lines · Delays</Label>
        <Label x={CORE.x} y={535} size={30} cls="sky-serif sky-italic" fill="#c7ecf6" o={clamp(t1*2.4-1.3)}>How do we find order in all this noise?</Label>
      </G>

      {/* ESTADO 2, cinco dimensiones */}
      <G o={constA}>
        {CONSTELLATIONS.map((c,i)=>{const ti=clamp(t2*8-i*.7);const hv=hover===i;return <g key={c.name} className="sky-constellation" style={{opacity:Math.max(ti,t7)}} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)}>
          {c.edges.map(([a,b])=><line key={a+"-"+b} x1={c.stars[a].x} y1={c.stars[a].y} x2={c.stars[b].x} y2={c.stars[b].y} stroke="#cfeaf3" strokeOpacity=".5" strokeWidth=".8" pathLength={1} strokeDasharray={1} strokeDashoffset={1-ease(ti)}/>)}
          {c.stars.map((s,k)=><g key={k}><circle cx={s.x} cy={s.y} r={7} fill="#c7ecf6" opacity=".35" filter="url(#sky-glow)"/><circle cx={s.x} cy={s.y} r={2.4} fill="#ffffff"/>
            {s.m&&<Label x={s.side==="l"?s.x-9:s.x+9} y={s.y+4} size={10.5} anchor={s.side==="l"?"end":"start"} fill="#a9cfdb" o={hv?1:.6}>{s.m}</Label>}</g>)}
          <Label x={c.label[0]} y={c.label[1]} size={11.5} cls="sky-sans sky-track">{c.name}</Label>
        </g>;})}
        <Label x={CORE.x} y={760} size={19} cls="sky-serif sky-italic" fill="#dff4fa" o={on(p,2)*clamp(t2*2-.5)}>We organize complexity into interpretable financial dimensions.</Label>
      </G>

      {/* ESTADO 3, las dimensiones convergen en un núcleo */}
      <G o={linksA}>
        {CONSTELLATIONS.map((c,i)=>{const q=centroid(c);return <line key={c.name} x1={q.x} y1={q.y} x2={CORE.x} y2={sy} stroke="#c7ecf6" strokeOpacity=".45" strokeWidth=".7" pathLength={1} strokeDasharray={1} strokeDashoffset={1-linkA(i)}/>;})}
      </G>
      <G o={scoreA}>
        <g style={{transform:`translate(${CORE.x}px,${sy}px)`,transition:"transform .8s ease"}}>
          <g style={{transform:`scale(${sc})`,transition:"transform .8s ease"}}>
            <circle r={170} fill="url(#sky-core)" opacity={.55*clamp(t3*2)*(1-small*.7+t7*.7)} style={{transition:"opacity .8s"}}/>
            <circle r={9} fill="#ffffff" opacity={clamp(t3*3)*(1-clamp(t3*3-1))} filter="url(#sky-glow)"/>
            <Label x={0} y={48} size={150} cls="sky-serif sky-num" fill="#ffffff" o={clamp(t3*4-.8)}>{score}</Label>
            <Label x={0} y={92} size={12.5} cls="sky-sans sky-track" fill="#c7ecf6" o={clamp(t3*4-1.4)}>FINANCIAL HEALTH SCORE</Label>
            <Label x={0} y={118} size={11} cls="sky-sans" fill="#9fc7d4" o={clamp(t3*4-1.8)}>0 = high risk · 100 = healthy</Label>
          </g>
        </g>
      </G>
      <G o={on(p,3)*clamp(t3*4-1.8)}>
        <Label x={1330} y={410} size={10.5} cls="sky-sans sky-track" fill="#9fc7d4" anchor="start">FROM</Label>
        {["millions of transactions","dozens of financial metrics","temporal evolution"].map((s,i)=><Label key={s} x={1330} y={434+i*22} size={14} fill="#dff4fa" anchor="start">{s}</Label>)}
        <Label x={1330} y={512} size={10.5} cls="sky-sans sky-track" fill="#9fc7d4" anchor="start">TO</Label>
        <Label x={1330} y={536} size={15} cls="sky-serif sky-italic" fill="#ffffff" anchor="start">one actionable signal</Label>
      </G>

      {/* ESTADO 4, ¿es predictivo? Línea temporal */}
      <G o={on(p,4)}><Label x={CORE.x} y={215} size={32} cls="sky-serif sky-italic" fill="#c7ecf6" o={clamp(t4*3)}>But is this score actually predictive?</Label></G>
      <G o={win(p,st(4),st(7),.05)}>
        <line x1={TL.x0} y1={TL.y} x2={TL.x1} y2={TL.y} stroke="#cfeaf3" strokeOpacity=".55" strokeWidth=".8" pathLength={1} strokeDasharray={1} strokeDashoffset={1-ease(clamp(t4*2.5-.2))}/>
        {MONTHS.map((m,i)=>{const a=clamp(t4*10-i*.9);return <g key={m} opacity={a}><circle cx={mx(i)} cy={TL.y} r={i===0?4:2.2} fill={i===0?"#ffffff":"#c7ecf6"} filter={i===0?"url(#sky-glow)":undefined}/><Label x={mx(i)} y={TL.y+26} size={10.5} cls="sky-sans sky-track" fill={i===0?"#ffffff":"#a9cfdb"}>{m}</Label></g>;})}
        <Label x={mx(0)} y={TL.y-18} size={10} cls="sky-sans sky-track" fill="#ffffff" o={clamp(t4*3-1)}>SCORE COMPUTED</Label>
        <path d={`M${mx(1)} ${TL.y-14} v-6 H${mx(6)} v6`} fill="none" stroke="#c7ecf6" strokeOpacity=".5" strokeWidth=".7" pathLength={1} strokeDasharray={1} strokeDashoffset={1-ease(clamp(t4*3-1))} opacity={1-clamp(t5*3)}/>
        <Label x={(mx(1)+mx(6))/2} y={TL.y-30} size={10} cls="sky-sans sky-track" fill="#a9cfdb" o={clamp(t4*4-1.6)*(1-clamp(t5*3))}>WHAT HAPPENS NEXT</Label>
        <G o={clamp(t4*4-1.6)*(1-clamp(t5*3))}>
          <Label x={CORE.x} y={640} size={17} cls="sky-serif" fill="#dff4fa">Score computed today.</Label>
          <Label x={CORE.x} y={666} size={17} cls="sky-serif" fill="#dff4fa">Validated on what happens next.</Label>
        </G>
      </G>

      {/* ESTADO 5, Gini: los tres faros */}
      <G o={win(p,st(5),st(7),.05)}>
        {GINI.map((g,i)=>{const a=ease(clamp(t5*4-i*.7));const x=mx(g.m);return <g key={g.v} opacity={a}>
          <line x1={x} y1={TL.y-6} x2={x} y2={TL.y-46-(1-a)*20} stroke="#c7ecf6" strokeOpacity=".35" strokeWidth=".7"/>
          <circle cx={x} cy={TL.y} r={10} fill="#ffffff" opacity=".55" filter="url(#sky-glow)"/><circle cx={x} cy={TL.y} r={3.2} fill="#ffffff"/>
          <circle cx={x} cy={TL.y-108} r={60} fill="url(#sky-core)" opacity=".28"/>
          <Label x={x} y={TL.y-88} size={68} cls="sky-serif sky-num" fill="#ffffff">{g.v}</Label>
          <Label x={x} y={TL.y-60} size={10.5} cls="sky-sans sky-track" fill="#c7ecf6">GINI · {g.m}M</Label>
        </g>;})}
        <Label x={CORE.x} y={640} size={17} cls="sky-serif" fill="#dff4fa" o={clamp(t5*4-1.8)}>The score ranks future risk, not just current status.</Label>
        <Label x={CORE.x} y={664} size={11} cls="sky-sans sky-track" fill="#9fc7d4" o={clamp(t5*4-2.2)}>VALIDATED OUT-OF-SAMPLE AND OUT-OF-TIME</Label>
      </G>

      {/* ESTADO 6, con qué predecimos: nota técnica ligera */}
      <G o={on(p,6)}>
        <Label x={CORE.x} y={712} size={10.5} cls="sky-sans sky-track sky-track-tight" fill="#a9cfdb"><tspan fill="#dff4fa">PREDICTED FROM</tspan>   liquidity · payment behavior · cash generation · debt load · counterparty concentration</Label>
        <Label x={CORE.x} y={738} size={11} cls="sky-sans" fill="#8db4c2">100+ engineered features, temporal trends and stress signals</Label>
        <Label x={CORE.x} y={760} size={10.5} cls="sky-sans sky-italic" fill="#7ea3b1">Stress signals such as overdraft, rising financial costs or missing critical payments reinforce the score.</Label>
      </G>

      {/* ESTADO 7, cierre: mapa de navegación alrededor del score */}
      <G o={t7}>
        {(()=>{const pts=Array.from({length:16},(_,k)=>{const r=k%2?66:158,a=k*Math.PI/8-Math.PI/2;return `${CORE.x+Math.cos(a)*r},${CORE.y+Math.sin(a)*r}`;});return <>
          <polygon points={pts.join(" ")} fill="none" stroke="#dff4fa" strokeOpacity=".55" strokeWidth=".7" pathLength={1} strokeDasharray={1} strokeDashoffset={1-ease(clamp(t7*1.8))}/>
          <circle cx={CORE.x} cy={CORE.y} r={182} fill="none" stroke="#c7ecf6" strokeOpacity=".3" strokeWidth=".6" strokeDasharray="2 6" opacity={clamp(t7*2-.6)}/>
          {[0,4,8,12].map(k=>{const a=k*Math.PI/8-Math.PI/2;return <circle key={k} cx={CORE.x+Math.cos(a)*182} cy={CORE.y+Math.sin(a)*182} r={2.6} fill="#ffffff" opacity={clamp(t7*2-.8)}/>;})}
        </>;})()}
        <G o={clamp(t7*3-.6)}>
          <Label x={CORE.x} y={650} size={54} cls="sky-serif" fill="#f5fbfd">From financial noise</Label>
          <Label x={CORE.x} y={708} size={54} cls="sky-serif sky-italic" fill="#c7ecf6">to financial foresight.</Label>
          <Label x={CORE.x} y={746} size={14} cls="sky-sans" fill="#b8d9e3" o={clamp(t7*3-1)}>See which companies need attention before the problem becomes obvious.</Label>
        </G>
      </G>
    </svg>
  </div>;
}
