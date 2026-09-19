/** Edit route order and media here without changing playback or navigation. */
export const presentation = [
  ["/escena/1", "1. Intro"], ["/escena/2", "Transición, La isla"],
  ["/escena/3", "2. El problema"], ["/calculo-score", "3. Cálculo del score"],
  ["/escena/4", "4. El cofre"], ["/producto/1", "5. Colocación de excedentes"],
  ["/producto/2", "6. Cash pooling"], ["/producto/3", "7. Monitor"],
  ["/escena/8", "8. Dos empresas"], ["/escena/6", "9. Gracias"],
] as const;
export const sectionLabel: Record<number, string> = {1:"01 / INTRO",2:"TRANSICIÓN / LA ISLA",3:"02 / EL PROBLEMA",4:"04 / EL COFRE",5:"ARCHIVO / EL PUERTO",6:"09 / FIN",8:"08 / DOS EMPRESAS"};
export const presentationHref = (path: string) => `${path}/?present=1`;
export const sceneMedia: Record<number, { title: string; video: string; poster: string; height: number }> = {
  1: { title: "Zarpar", video: "/video/zarpar-seedance.mp4", poster: "/video/zarpar-seedance.jpg", height: 650 },
  2: { title: "La isla", video: "/video/isla-seedance.mp4", poster: "/video/isla-seedance.jpg", height: 300 },
  3: { title: "Las estrellas", video: "/video/estrellas-seedance.mp4", poster: "/video/estrellas-seedance.jpg", height: 450 },
  4: { title: "El cofre", video: "/video/cofre-seedance.mp4", poster: "/video/cofre-seedance.jpg", height: 400 },
  5: { title: "El puerto", video: "/video/puerto-seedance.mp4", poster: "/video/puerto-seedance.jpg", height: 300 },
  6: { title: "Cierre", video: "/video/cierre-seedance.mp4", poster: "/video/cierre-seedance.jpg", height: 100 },
};
