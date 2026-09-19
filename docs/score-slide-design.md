# Slide del score

Una sola slide: 105 variables → modelo predictivo → score de 0–100. «SCORE VALIDADO» es el titular dominante; «Estado actual. Tendencia futura.» describe la lectura buscada, con una aclaración visible de que se trata de estimaciones. Gini queda como evidencia secundaria.

La textura actual se generó con la herramienta integrada `image_gen` y se conserva en `apps/web/public/images/score-navy-cardstock-v2.png`. El velo oscuro es ligero para que la textura rugosa sea visible. La versión anterior permanece en `score-navy-cardstock.png`. Todo el texto y las cifras son HTML editables. El modelo se identifica como gradient boosting.

Fuente de cifras: `output/03_validation/report_v3.md` (copia revisada en `../team-review-main`). Gini: 0,540 / 0,439 / 0,379. 1.282 empresas, 15.803 filas. El panel contiene 105 variables antes de añadir percentiles.

Tipografía actual: Manrope en toda la slide, siguiendo la sección «Diseño elegido para las slides de contenido» de `apps/web/DESIGN-EMBAT.md`. Escala de 52, 24 y 18 px; pesos 400 y 500. Sin cursivas, caligrafía, efectos de plata ni entrada por letras. La fuente experimental anterior permanece como recurso sin uso.

## Prompt final de la textura v2

Generate a realistic material photograph, landscape 16:9, only a flat full-frame sheet of dark navy blue ROUGH ART CARDSTOCK / thick cold-pressed watercolor paper. Tangible rough matte cellulose surface, irregular short paper fibers and shallow little dents, very clearly PAPER, not woven fabric, velvet, felt, leather, clouds, stone or outer space. Soft grazing light from upper left reveals the relief without shadows from other objects. Rich midnight ink-blue #101D38 midtone, slightly lighter slate blue grains and tiny dark irregular cavities, readable tactile grain visible even as a full-screen presentation background. Even continuous surface; no edges, no objects, no writing, no stars, no metallic flecks, no vignette. Refined but unmistakably physical rough cardstock.

## Prompt de la primera textura (conservada)

Use case: stylized-concept. Asset type: seamless subtle material background for a sophisticated financial presentation. Generate ONLY a full-frame close-up, straight-on flat scan of very dark midnight navy blue artist's cotton rag cardstock, dyed through, matte and slightly rough, beautiful organic paper fibers and delicate uneven paper grain. Deep ink blue around #0A1430, restrained subtle variations, low contrast texture, no bright highlights. Soft even museum lighting with a very faint lighter blue central area. This is a physical paper surface, not outer space. No objects, no typography, no text, no stars, no silver marks, no borders, no folds, no tears, no gradients that look digital, no vignette frame. Landscape 16:9 composition. It will be used behind editable silver calligraphy; keep texture quiet enough for readable silver text.

## Texto y legibilidad

Revisión con la skill `humanizer`: frases directas, sin «futuro observado» ni etiquetas abstractas. Texto principal de 17 a 23 px, frente a 10–13 px antes. Los 24 indicadores base, 72 cambios y rachas, 9 señales y la prueba temporal siguen documentados en «Método y alcance». Se mantienen el titular, el flujo y los Gini.
