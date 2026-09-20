"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { waterPortal } from "@/lib/water-portal";

/** Water refracts the moving film, merges into a surface, then reveals the real link. */
export function WaterPortal(){
  const root=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const host=root.current,el=canvas.current;if(!host||!el)return;
    const motion=matchMedia("(prefers-reduced-motion: reduce)");if(motion.matches)return;
    const cleanup=waterPortal(el,host,host.querySelector<HTMLAnchorElement>("a")!);
    motion.addEventListener("change",cleanup);
    return()=>{cleanup();motion.removeEventListener("change",cleanup);};
  },[]);
  return <div ref={root} className="water-portal">
    <canvas ref={canvas} className="water-portal-canvas" aria-hidden="true"/>
    <Link href="/plataforma/" className="closing-platform-button water-portal-button">
      <span className="water-portal-label">Entrar en la plataforma</span>
      <span className="closing-platform-arrow" aria-hidden="true">→</span>
    </Link>
  </div>;
}
