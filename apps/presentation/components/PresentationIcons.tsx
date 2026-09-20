export function PresentationIcon({name}:{name:"left"|"right"|"skipLeft"|"skipRight"|"restart"|"menu"|"arrowRight"|"close"|"fullscreen"|"exitFullscreen"}){
  const paths={arrowRight:"M4 12h16m-7-7 7 7-7 7",left:"m15 6-6 6 6 6",right:"m9 6 6 6-6 6",skipLeft:"m11 6-6 6 6 6m8-12-6 6 6 6",skipRight:"m5 6 6 6-6 6m8-12 6 6-6 6",restart:"M3 10a9 9 0 1 1 2 8M3 4v6h6",menu:"M5 6h14M5 12h14M5 18h14",close:"M6 6l12 12M18 6 6 18",fullscreen:"M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5",exitFullscreen:"M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"};
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}
