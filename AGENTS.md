# Instrucciones para agentes

Repo `amarkosmarkos/Elkano_Embat`, HackSpain 2026, reto de Embat. Monorepo pnpm; la app web está en `apps/web` (Next.js 15, App Router, React 19, TypeScript, export estático).

Dos cosas viven en la misma app y se despliegan por separado:

- La **presentación** (el deck): rama `xubranch`, rutas `/intro`, `/escena/*`, `/calculo-score`, `/producto/*`, `/anexo`, `/caso/*`. Producción: <https://elkano-embat-deck.vercel.app/intro/?present=1>.
- La **plataforma** (score, marketplace, cash pooling, seguro): rama `main`, rutas `/cartera/*`, `/productos/*`, `/empresa/*`. Producción: <https://elkano-embat-web.vercel.app/>. La despliega Markos; no la toques desde aquí.

## Desplegar la presentación en Vercel

El proyecto de Vercel es `elkano-embat-deck`, en la cuenta de Xuban (scope `xubanceccons-projects`). No está conectado a Git: cada despliegue es una subida manual de la carpeta `apps/web/out` generada por `next build`. Un push a `xubranch` no redespliega nada por sí solo.

Pasos, desde la raíz del repo:

```bash
cd apps/web
npx tsc --noEmit -p .                      # 1. sin errores de tipos
npx next build                             # 2. genera apps/web/out (unos 20 s, 1.500 páginas estáticas)
cd out
vercel link --yes --project elkano-embat-deck --scope xubanceccons-projects   # 3. obligatorio: el build borra out/.vercel
vercel deploy --prod --yes --scope xubanceccons-projects                      # 4. sube y publica en elkano-embat-deck.vercel.app
```

El paso 3 no es opcional. `next build` vacía `out/` y con ella el enlace al proyecto; si se despliega sin volver a enlazar, la CLI crea un proyecto nuevo llamado `out` y publica en una URL equivocada. Si pasa, borrarlo con `printf 'y\n' | vercel project rm out --scope xubanceccons-projects` (el comando no admite `--yes`).

Comprobar después:

```bash
for u in "/intro/?present=1" "/anexo/?present=1" "/caso/a/?present=1" "/escena/6/?present=1"; do
  echo "$u -> $(curl -s -o /dev/null -w '%{http_code}' -I "https://elkano-embat-deck.vercel.app$u")"
done
```

Todo debe devolver 200. Las URL de preview (`elkano-embat-deck-xxxx-xubanceccons-projects.vercel.app`) devuelven 302 porque están protegidas con login de Vercel: para el jurado sirve solo el dominio de producción.

Detalles que importan:

- La primera vez en una máquina nueva: `vercel login` con la cuenta de Xuban. El `vercel link` del paso 3 crea `apps/web/out/.vercel/` y un `.env.local`; `out/` está en `.gitignore`, así que no ensucian el repo.
- `next.config.mjs` usa `output: "export"`, `trailingSlash: true` e `images.unoptimized`. No cambiar a SSR: el deck no tiene servidor.
- El servidor de desarrollo es `pnpm --filter web dev` (puerto 4321) y escribe en `.next-dev`, así que se puede hacer `next build` con el dev server encendido.
- Si hace falta que un push despliegue solo: conectar el repo al proyecto desde el panel de Vercel (Root Directory `apps/web`, Production Branch `xubranch`). Requiere que la cuenta de GitHub de quien conecta tenga acceso al repo de Markos a través de la app de Vercel.

## Trabajar en la presentación

- Orden de slides, medios de cada escena, Looms del modo demo y URL de la plataforma: `apps/web/lib/presentation.ts`. Es el único sitio donde se cambia el orden.
- Textos y cifras de productos y casos: `apps/web/components/ContentSlides.tsx`. Las cifras de Atlas Motors y Harbor Foods salen de `Elkano_Embat_auditoria/output/caso_A_B.md` (agosto de 2026); no recalcularlas ni ajustarlas para que cuadren.
- Guía visual: `apps/web/DESIGN-EMBAT.md`. Cada slide debe entrar sin scroll a 1280x720 y a 1440x900; medirlo antes de dar algo por terminado.
- Reglas de lenguaje: nunca "predecimos impago"; la PD del marketplace se etiqueta como frecuencia de estrés a 6 meses; los nombres de empresa son alias del CSV.
- Los datos (`output/`, 646 MB) no van al repo.
