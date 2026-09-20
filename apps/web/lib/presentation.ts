/** Edit route order and media here without changing playback or navigation. */
export const presentation = [
  ["/escena/1", "Intro"],
  ["/escena/3", "El problema"], ["/calculo-score", "Cálculo del score"],
  ["/escena/4", "El cofre"], ["/producto/1", "Marketplace de crédito"],
  ["/producto/3", "Seguro de crédito"], ["/producto/2", "Cash pooling"],
  ["/escena/8", "Dos empresas"],
  ["/caso/a", "Atlas Motors"], ["/caso/b", "Harbor Foods"],
  ["/escena/6", "Gracias"],
] as const;
export const sectionLabel: Record<number, string> = {1:"01 / INTRO",2:"TRANSICIÓN / LA ISLA",3:"02 / EL PROBLEMA",4:"04 / EL COFRE",5:"ARCHIVO / EL PUERTO",6:"11 / FIN",8:"08 / DOS EMPRESAS"};
export const presentationHref = (path: string) => `${path}/?present=1`;
/** Demo mode swaps these routes for a full-slide Loom recording. Paste the share or embed URL of each video.
 *  The current link is Loom's public "How to share your video" clip, a stand-in until the real demos are recorded. */
const placeholderLoom = "https://www.loom.com/share/31f430c1a1e744b8a7b6c18a26982c71";
export const demoMedia: Record<string, { loom: string; title: string }> = {
  "/producto/1": { loom: "https://www.loom.com/share/60f1634ed14847afb8fbe437ba48653a", title: "Marketplace de crédito" },
  "/producto/2": { loom: "https://www.loom.com/share/48968ba057c745e888510af5b2393709", title: "Cash pooling" },
  "/producto/3": { loom: placeholderLoom, title: "Seguro de crédito" },
};
/** Accepts loom.com/share/<id> or loom.com/embed/<id> and returns the embed URL without Loom's chrome. */
export const loomEmbed = (url: string) => {
  const id = url.match(/loom\.com\/(?:share|embed)\/([0-9a-f]+)/i)?.[1];
  return id ? `https://www.loom.com/embed/${id}?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true&autoplay=false` : null;
};
/** `cut` stops the clip at that fraction of its duration (the rest is never shown); `autoAdvance` then moves on by itself after `hold` ms. */
export const sceneMedia: Record<number, { title: string; video: string; poster: string; height: number; still?: string; cut?: number; autoAdvance?: boolean; hold?: number }> = {
  1: { title: "Zarpar", video: "/video/zarpar-seedance.mp4", poster: "/video/zarpar-seedance.jpg", height: 650 },
  2: { title: "La isla", video: "/video/isla-ref13.mp4", poster: "/video/isla-ref13.jpg", height: 300 },
  // Escena 3: el vídeo sigue al scroll y SkyStory dibuja encima. Cuatro estados, ~1,3 pantallas cada uno.
  3: { title: "Las estrellas", video: "/video/estrellas-ref13.mp4", poster: "/video/estrellas-ref13.jpg", height: 560 },
  // Escena 4: el cofre se abre a los 3,6 s y los tres rollos quedan a la vista; cortamos a los 4,8 s, antes de que un pergamino empiece a levantarse.
  4: { title: "El cofre", video: "/video/cofre-ref13.mp4", poster: "/video/cofre-ref13.jpg", height: 400, cut: .60, autoAdvance: true, hold: 3200 },
  5: { title: "El puerto", video: "/video/puerto-seedance.mp4", poster: "/video/puerto-seedance.jpg", height: 300 },
  6: { title: "Cierre", video: "/video/cierre-hq.mp4", poster: "/video/cierre-hq.jpg", height: 100 },
  8: { title: "Dos empresas", video: "/video/isla-ciudad-ref13.mp4", poster: "/video/isla-ciudad-ref13.jpg", height: 350 },
};
