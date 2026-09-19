// Lectura de los JSON estáticos en tiempo de build (server components).
// Los ficheros viven en apps/web/public/data/ y los genera el pipeline de Python
// (o, para desarrollar, `node apps/web/scripts/mock-data.mjs`).
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { CompanyDetail, CompanySummary, Group, Overview } from "./types";

const DATA_DIR = join(process.cwd(), "public", "data");

function readJson<T>(rel: string): T {
  const p = join(DATA_DIR, rel);
  if (!existsSync(p)) {
    throw new Error(
      `Falta el fichero de datos ${p}. Genera los datos (pipeline Python) o ejecuta: node apps/web/scripts/mock-data.mjs`,
    );
  }
  return JSON.parse(readFileSync(p, "utf8")) as T;
}

let _overview: Overview | null = null;
let _companies: CompanySummary[] | null = null;
let _groups: Group[] | null = null;

export function getOverview(): Overview {
  return (_overview ??= readJson<Overview>("overview.json"));
}

export function getCompanies(): CompanySummary[] {
  return (_companies ??= readJson<CompanySummary[]>("companies.json"));
}

export function getCompany(id: string): CompanySummary | undefined {
  return getCompanies().find((c) => c.id === id);
}

export function getCompanyDetail(id: string): CompanyDetail | null {
  const p = join(DATA_DIR, "company", `${id}.json`);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8")) as CompanyDetail;
}

export function getGroups(): Group[] {
  if (_groups) return _groups;
  const p = join(DATA_DIR, "groups.json");
  _groups = existsSync(p) ? readJson<Group[]>("groups.json") : [];
  return _groups;
}

export function getGroup(id: string): Group | undefined {
  const g = getGroups().find((x) => x.id === id);
  if (g) return g;
  // Fallback: construir el grupo a partir de companies.json si no está en groups.json
  const members = getCompanies().filter((c) => c.group_id === id);
  if (!members.length) return undefined;
  const surplus = members.filter((m) => m.cash > 0).reduce((a, m) => a + m.cash, 0);
  const overdraft = members.filter((m) => m.cash < 0).reduce((a, m) => a - m.cash, 0);
  return { id, size: members.length, members: members.map((m) => m.id), surplus, drawn: 0, overdraft, nettable: Math.min(surplus, overdraft), pooling: false };
}

/** Todos los ids de grupo: los de groups.json más los que aparezcan en companies.json. */
export function getGroupIds(): string[] {
  const ids = new Set<string>(getGroups().map((g) => g.id));
  for (const c of getCompanies()) if (c.group_id) ids.add(c.group_id);
  return [...ids].sort();
}

/** Empresa "de demo" para el enlace de la barra de navegación: en alerta y empeorando, la de mayor score. */
export function getFeaturedCompanyId(): string {
  const cs = getCompanies();
  // empresa del guion del pitch (se tuerce: 72 → 45), si existe en los datos
  if (cs.some((c) => c.id === "COMP_0945")) return "COMP_0945";
  const cand =
    cs.filter((c) => c.alert === 1 && c.trend === "empeora").sort((a, b) => b.score - a.score)[0] ??
    cs.filter((c) => c.trend === "empeora").sort((a, b) => b.score - a.score)[0] ??
    cs[0];
  return cand?.id ?? "COMP_0001";
}

/** Grupo "de demo" para la barra de navegación: el primero con pooling y más neteable. */
export function getFeaturedGroupId(): string {
  const gs = getGroups();
  // grupo del guion del pitch (seis filiales, tres préstamos internos con límites por score)
  if (gs.some((g) => g.id === "GROUP_0067")) return "GROUP_0067";
  const cand = gs.filter((g) => g.pooling).sort((a, b) => b.nettable - a.nettable)[0] ?? gs[0];
  return cand?.id ?? getGroupIds()[0] ?? "GROUP_0001";
}
