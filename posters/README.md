# Póster Embat

Versión HD actual: `embat-poster-v6-hd.png` y `.jpg`, 4800 x 7200 px a 300 ppp.
La V5 de 1800 x 2700 se conserva.

La V6 usa una ampliación 4x del fotograma original con Topaz High Fidelity V3
en fal (`topaz/upscale/image/precision`), sin realce facial. La fuente ampliada
es `assets/ship-slide1-5p75s-topaz4x.png`, 5120 x 2880. Coste según la tarifa
consultada: 0,08 USD para esta salida de menos de 24 megapíxeles.
La composición, las letras y los logos se vuelven a dibujar en Python con
`make_hd_poster.py`. El script también genera una comparación con Lanczos al
100%. Se corrige una franja defectuosa de 12 píxeles del borde del archivo Topaz
copiando únicamente el borde limpio inmediato, sin cambiar el encuadre interior.

4800 x 7200 equivale a 40,64 x 60,96 cm a 300 ppp. Esto expresa la densidad del
archivo, no detalle fotográfico nativo: las velas mejoran algo y el casco sigue
limitado por la fuente 720p. Falta adaptar sangrado y perfil de color a la imprenta.

Composición hecha con Python, Pillow y NumPy. El barco es el fotograma del
segundo 5,75 del vídeo 13 de la presentación. No se llama a un generador de
imágenes para componer este póster. El vídeo original sí fue creado con Seedance.
El pequeño retrato de Elkano se reutiliza del logo ya aprobado de la web.

Incluye recorte y ajuste de color del fotograma, extensión del cielo a partir
de sus píxeles, degradado inferior, tipografía Manrope y logo HackSpain original.
Elkano y HackSpain van juntos en el pie. La versión anterior está en `versions/`.

## Reproducir

Instalar Pillow y NumPy en el entorno Python que se use. Desde la raíz:

```sh
python posters/make_python_poster.py
# Versión HD, con el archivo Topaz ya descargado:
python posters/make_hd_poster.py
```

El script utiliza solo archivos incluidos en el repo. Escribe los dos archivos
V5 y una vista previa en `posters/`. Las fuentes y su licencia están en
`apps/web/public/fonts/`. El SVG original y su rasterización están en `assets/`.

La fuente es 1280 x 720; el recorte empleado tiene 820 x 720 píxeles. La salida
está ampliada y todavía no es arte final de imprenta. Tras elegir la composición,
conviene ampliar la imagen del barco y volver a componer las letras y logos a
la resolución de impresión. No hace falta pasar la tipografía por un upscaler.
