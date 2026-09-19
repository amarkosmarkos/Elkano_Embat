# Póster Embat

Versión actual: `embat-poster-v5-python.png` y `.jpg`, 1800 x 2700 px.

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
```

El script utiliza solo archivos incluidos en el repo. Escribe los dos archivos
V5 y una vista previa en `posters/`. Las fuentes y su licencia están en
`apps/web/public/fonts/`. El SVG original y su rasterización están en `assets/`.

La fuente es 1280 x 720; el recorte empleado tiene 820 x 720 píxeles. La salida
está ampliada y todavía no es arte final de imprenta. Tras elegir la composición,
conviene ampliar la imagen del barco y volver a componer las letras y logos a
la resolución de impresión. No hace falta pasar la tipografía por un upscaler.
