# Presentación Elkano, V1

Entrada: `/intro/` o `/escena/1/`. Seis escenas y catorce paradas, intercalando
vídeo y las páginas reales del producto. El ritmo lo marca quien presenta:
el metraje no obliga a terminar la charla en cuarenta segundos.

## Controles

- Scroll vertical: recorre el vídeo y revela sus textos.
- Flechas izquierda/derecha: capítulo anterior/siguiente.
- Control inferior derecho: índice completo y navegación con ratón.
- Al acabar una escena aparece un botón grande para continuar.
- El cierre se reproduce automáticamente una vez, con pausa y repetición.
- `?p=0.5` abre una escena a mitad de recorrido, útil para revisar composición.
- Las páginas del producto llevan `?present=1` para mostrar el navegador del guion.
  Las flechas no interceptan la edición de campos, selectores o controles de vídeo.
- Se respeta la preferencia de movimiento reducido: fondos detenidos, capas
  legibles mediante scroll; cierre con sus créditos visibles.

## Editar sin rehacer

- `lib/presentation.ts`: orden de las catorce paradas, nombres, vídeos, posters
  y longitud de scroll de cada escena.
- `components/Escena.tsx`: textos, intervalos y constelación SVG.
- `components/PresentationNav.tsx`: navegación transversal al producto.
- `app/globals.css`: estilos aislados bajo `scene-` y `presentation-`.
- `public/video/*-seedance.mp4`: copias web de los vídeos 13 a 18, en orden.
  H.264, CRF 23, GOP 12, faststart, 720p, 24 fps, sin audio, cada uno menor de 8 MB.
  Los originales y los fallbacks `*-blender` se conservan.

## Verificación

`next build` exporta las seis rutas a `out/`, junto con el resto de la app.
No ejecutar el build al mismo tiempo que `next dev` sobre la misma carpeta `.next`.
`node scripts/check-presentation.mjs http://localhost:4321` comprueba todas
las paradas, posters y respuesta HTTP 206 de los vídeos. Un servidor estático
sin soporte Range no sirve para comprobar correctamente el scroll del vídeo.

Revisión visual en Chrome: intro al 50% y 95%, isla al 90%, estrellas al 88%,
cofre al 85%, puerto al 85% y cierre tras reproducción automática. Comprobado
salto por teclado entre escenas y desde estrellas a la página real del score.

## Alcance y siguientes iteraciones

Esta V1 integra el guion de `PROMPT-astra.md`, sin cambiar los JSON ni el modelo
de score. Las operaciones siguen siendo simulaciones locales de la app existente.
Los textos de producto y las afirmaciones comerciales proceden del guion:
conviene validarlos con el equipo antes de grabar. No se han generado vídeos nuevos
ni gastado créditos. No se ha realizado un despliegue público en esta iteración.
