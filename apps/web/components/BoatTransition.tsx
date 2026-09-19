"use client";
import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** Only company A scales in, when entering from the harbour. */
export function BoatTransition(){
  const path=usePathname()?.replace(/\/$/,"")??"";
  const previous=useRef("");
  useLayoutEffect(()=>{
    const from=previous.current;previous.current=path;
    if(from!=="/escena/8"||path!=="/caso/a"||new URLSearchParams(location.search).get("boat")==="skip"||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    const slide=document.querySelector<HTMLElement>('[data-company-slide="a"]');
    if(!slide)return;
    const origin=slide.style.transformOrigin;
    slide.style.transformOrigin="60% 65%";
    const animation=slide.animate([
      {opacity:0,transform:"scale(.72)"},
      {opacity:1,transform:"scale(1)"},
    ],{duration:520,easing:"cubic-bezier(.22,1,.36,1)",fill:"both"});
    const stop=()=>{animation.cancel();slide.style.transformOrigin=origin;};
    const key=(e:KeyboardEvent)=>{if(e.key==="Escape")stop();};
    animation.finished.then(stop).catch(()=>{});
    window.addEventListener("keydown",key);
    return()=>{stop();window.removeEventListener("keydown",key);};
  },[path]);
  return null;
}
