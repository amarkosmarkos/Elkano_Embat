# Presentación de Elkano
  <h1 align="center">⛵ Elkano</h1>
  <p align="center"><strong>Estimamos cómo está una empresa y hacia dónde va.</strong><br>HackSpain 2026, reto de Embat</p>
</p>

<p align="center">
  <img src="docs/media/elkano-intro.gif" alt="Presentación de Elkano: un barco con las velas de Embat navega mientras entra el texto" width="720" />
</p>

<p align="center">
  <a href="https://elkano-embat-deck.vercel.app/intro/?present=1"><strong>Presentación</strong></a>
  &nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="https://elkano-embat-web.vercel.app/"><strong>Plataforma</strong></a>
</p>

---

<p align="center">
  <a href="https://youtu.be/Z-8mgZ1eJy8"><img src="https://img.youtube.com/vi/Z-8mgZ1eJy8/maxresdefault.jpg" alt="Ver el vídeo de la demo en YouTube" width="720" /></a>
</p>

---

## Qué es

Embat nos dio 1.286 empresas, 24 meses de movimientos bancarios y 900.000 facturas. Con eso construimos un **score de 0 a 100** por empresa: 105 variables (24 métricas, su tendencia y 9 señales de estrés), un modelo a 3 y 6 meses, y una validación fuera de muestra con Gini de 0,54 a un mes. El score no predice quiebras: ordena las empresas por el estrés financiero que aparece después.

Sobre el score, tres productos que solo Embat puede ofrecer porque ve la caja de todas a la vez:

| | Producto | Qué hace |
|---|---|---|
| 1 | **Marketplace de crédito** | Una empresa con caja presta a las que la necesitan. El score elige a quién y reparte la exposición. |
| 2 | **Seguro de crédito continuo** | Asegura los cobros de una empresa y ajusta la prima cada mes según el score de sus clientes. |
| 3 | **Cash pooling** | Antes de pedir al banco, una filial cubre a otra con la liquidez del grupo. |

## Cómo arrancar

```bash
pnpm install
pnpm dev          # http://localhost:4321
```

Node 22.12 o superior y pnpm 11. La app lee el score y las métricas de los ficheros del repo; no necesita base de datos. Los datos crudos (646 MB) no van al repo: descomprimir `output_hackspain_data.zip` en la raíz.

## Más

- [Presentación](apps/presentation): el código del deck (Next.js estático, vídeos, modo demo). Cómo desplegarlo, en su [README](apps/presentation/README.md).
- [Plataforma](apps/web/README.md): qué lee cada pantalla.
- [Documentación](docs/README.md): reto, mapa de datos, métricas, score y validación.
- [Pipeline](pipeline/README.md) y [analytics](analytics/README.md): de los CSV al score y su evaluación.
- [Resultados](output/README.md): `scores_v3.csv` y el informe de validación.

<p align="center"><sub>Luken, Nagore, Markos, David y Xuban</sub></p>
