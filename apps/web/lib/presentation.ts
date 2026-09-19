/** Edit route order and media here without changing playback or navigation. */
export const presentation = [
  ["/escena/1", "1. Intro"],
  ["/escena/3", "2. El problema"], ["/calculo-score", "3. Cálculo del score"],
  ["/escena/4", "4. El cofre"], ["/producto/1", "5. Colocación de excedentes"],
  ["/producto/2", "6. Cash pooling"], ["/producto/3", "7. Monitor"],
  ["/escena/8", "8. Dos empresas"], ["/escena/6", "9. Gracias"],
] as const;
export const sectionLabel: Record<number, string> = {1:"01 / INTRO",2:"TRANSICIÓN / LA ISLA",3:"02 / EL PROBLEMA",4:"04 / EL COFRE",5:"ARCHIVO / EL PUERTO",6:"09 / FIN",8:"08 / DOS EMPRESAS"};
export const presentationHref = (path: string) => `${path}/?present=1`;
export const sceneMedia: Record<number, { title: string; video: string; poster: string; height: number; still?: string }> = {
  1: { title: "Zarpar", video: "/video/zarpar-seedance.mp4", poster: "/video/zarpar-seedance.jpg", height: 650 },
  2: { title: "La isla", video: "/video/isla-ref13.mp4", poster: "/video/isla-ref13.jpg", height: 300 },
  // Escena 3: el vídeo sigue al scroll y SkyStory dibuja encima. Cuatro estados, ~1,3 pantallas cada uno.
  3: { title: "Las estrellas", video: "/video/estrellas-ref13.mp4", poster: "/video/estrellas-ref13.jpg", height: 560 },
  4: { title: "El cofre", video: "/video/cofre-ref13.mp4", poster: "/video/cofre-ref13.jpg", height: 400 },
  5: { title: "El puerto", video: "/video/puerto-seedance.mp4", poster: "/video/puerto-seedance.jpg", height: 300 },
  6: { title: "Cierre", video: "/video/cierre-ref13.mp4", poster: "/video/cierre-ref13.jpg", height: 100 },
  8: { title: "Dos empresas", video: "/video/isla-ciudad-ref13.mp4", poster: "/video/isla-ciudad-ref13.jpg", height: 350 },
};
