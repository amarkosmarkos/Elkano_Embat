/** Edit route order and media here without changing playback or navigation. */
export const presentation = [
  ["/escena/1", "Zarpar"], ["/escena/2", "La isla"], ["/escena/3", "Las estrellas"],
  ["/score", "El score"], ["/empresa/COMP_0945", "Una empresa se tuerce"],
  ["/empresa/COMP_0640", "Otra recupera el rumbo"], ["/escena/4", "El cofre"],
  ["/empresa/COMP_0054", "Colocación de excedentes"], ["/grupo/GROUP_0067", "Cash pooling"],
  ["/empresa/COMP_0636", "La señal de aviso"], ["/monitor", "El monitor"],
  ["/escena/5", "El puerto"], ["/operaciones", "Las decisiones ejecutadas"], ["/escena/6", "Cierre"],
] as const;
export const presentationHref = (path: string) => `${path}/?present=1`;
export const sceneMedia: Record<number, { title: string; video: string; poster: string; height: number }> = {
  1: { title: "Zarpar", video: "/video/zarpar-seedance.mp4", poster: "/video/zarpar-seedance.jpg", height: 650 },
  2: { title: "La isla", video: "/video/isla-seedance.mp4", poster: "/video/isla-seedance.jpg", height: 300 },
  3: { title: "Las estrellas", video: "/video/estrellas-seedance.mp4", poster: "/video/estrellas-seedance.jpg", height: 450 },
  4: { title: "El cofre", video: "/video/cofre-seedance.mp4", poster: "/video/cofre-seedance.jpg", height: 400 },
  5: { title: "El puerto", video: "/video/puerto-seedance.mp4", poster: "/video/puerto-seedance.jpg", height: 300 },
  6: { title: "Cierre", video: "/video/cierre-seedance.mp4", poster: "/video/cierre-seedance.jpg", height: 100 },
};
