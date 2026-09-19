import { useLayoutEffect, useState } from "react";

export interface Fit { scale: number; width: number; height: number }

/**
 * Sizes the fixed-layout app to its host container (#root — the iframe viewport or an embedding <div>)
 * and down-scales with CSS zoom when the container is smaller than the design minimum, so every screen
 * always fits without scrolling.
 */
export function useFitScale(minW = 1180, minH = 720): Fit {
  const [fit, setFit] = useState<Fit>({ scale: 1, width: window.innerWidth, height: window.innerHeight });
  useLayoutEffect(() => {
    const host = document.getElementById("root") ?? document.body;
    const update = () => {
      const w = host.clientWidth || window.innerWidth;
      const h = host.clientHeight || window.innerHeight;
      const scale = Math.min(1, w / minW, h / minH);
      setFit({ scale, width: w / scale, height: h / scale });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(host);
    window.addEventListener("resize", update);
    return () => { ro.disconnect(); window.removeEventListener("resize", update); };
  }, [minW, minH]);
  return fit;
}
