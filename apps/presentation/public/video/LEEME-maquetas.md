# Seis escenas de Blender, v1 de la presentación

Estas son maquetas de composición y timing, no el acabado final de Seedance.
Los vídeos están renderizados a 800×450, 24 fps, H.264 CRF 23, sin audio,
faststart y GOP de 12. Los fotogramas se renderizan de forma nativa a
1920×1080, JPEG calidad 90. Cada asset tiene copia `-blender` de respaldo.

| Escena | Archivos para Next.js | Uso |
| --- | --- | --- |
| 1. Zarpar | barco-largo.mp4 | 12 s, scroll |
| 2. La isla | isla.mp4, isla.jpg | 6 s, scroll y pausa final |
| 3. Las estrellas | estrellas.jpg | Fondo fijo para constelación SVG |
| 4. El cofre | cofre-cerrado.jpg, cofre-abierto.jpg | Cambio de imagen al abrir |
| 5. El puerto | puerto.jpg | Fondo fijo para propuesta de valor |
| 6. Cierre | cierre.mp4, cierre.jpg | 8 s, reproducción y pausa final |

Los textos, números, tarjetas y constelación no están quemados en las imágenes:
se superponen en React. `barco.mp4` y la intro existente no se han sustituido.
No se ha integrado aún la navegación de las seis escenas.

Fuera del repo, en `../blender/`, están los seis `ELKANO-scene*.blend`, los
constructores `scene01_zarpar.py` y `remaining_scenes.py`, y los scripts de
exportación/verificación. La fuente V6 original permanece intacta.

En `../videos/`: 9.mp4 = Zarpar, 10.mp4 = isla, 11.mp4 = cierre,
12.mp4 = montaje de revisión de las seis escenas (40 segundos).
Los decorados de isla, puerto y cofre son deliberadamente esquemáticos.
Pendiente: revisar con Xuban, integrar en Next.js, y aprobar el acabado
Seedance. No se ha enviado ninguna generación ni consumido créditos.
