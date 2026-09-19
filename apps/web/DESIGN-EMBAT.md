# Embat aplicado a la presentación

Revisión del 19 de septiembre de 2026. Fuentes inspeccionadas:
- https://www.embat.io/
- https://www.embat.io/treasury-management
- https://www.embat.io/pricing

## Observado en el sitio

Los estilos calculados y las variables CSS de la home dan estos valores:

| Uso | Valor |
| --- | --- |
| Texto principal y fondo oscuro | #050B2C |
| Acción principal | #3878F6 |
| Hover de acción | #0338BB |
| Azul claro | #E7EFFF |
| Texto secundario | #6E707C |
| Texto de tarjetas | #42444C |
| Superficie secundaria | #FBFBFC |
| Borde secundario | #D2D2DB |
| Fuente | HafferSQXH, pesos 400 y 500 |
| Cuerpo principal | 18 px, interlineado 27 px |
| H1 | Escala fluida de 32 a 52 px, interlineado 1,2 |
| H2 | Escala fluida de 24 a 40 px |
| Botones | 16 px, padding 12 x 24 px, radio 4 px |

La home alterna hero oscuro con bloques blancos, columnas de texto y capturas
de producto. La cabecera es blanca. El contenido tiene anchos limitados y
espaciado amplio. Pricing usa módulos de fondo casi blanco, padding de 24 px
y radio de 12 px. Los enlaces secundarios llevan flecha; las acciones principales,
un rectángulo azul. El contraste lo construyen las superficies, no las sombras.

## Aplicación a Elkano

Se conservan el guion, los vídeos y los placeholders. Las secciones web son
blancas; los vídeos conservan su fondo oscuro. La intro usa una columna de
texto sobre un degradado, sin el panel de cristal de la V1. Se retiran las
serif, cursivas y acentos verdes decorativos. El verde del estado financiero
permanece: indica salud, no una acción de marca.

Manrope sustituye a HafferSQXH. No es la fuente de Embat: se eligió por su
construcción geométrica y su licencia abierta. Sus archivos y licencia SIL OFL
están en `public/fonts/`; no hay peticiones a Google al abrir la presentación.
Fuente: https://fonts.google.com/specimen/Manrope

`app/embat-presentation.css` contiene la adaptación. `PresentationBrand.tsx`
mantiene el nombre Elkano y un símbolo propio de vela, sin presentarnos como
la web oficial de Embat. No se copian sus textos comerciales ni cifras.

La navegación tiene estados hover y foco. Los efectos duran 180 ms y se
desactivan con movimiento reducido. Se conserva el bloqueo de overscroll.
