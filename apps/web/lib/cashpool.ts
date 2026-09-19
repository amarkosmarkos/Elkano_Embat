// Motor de cash pooling: reglas explícitas sobre datos reales de un grupo. Nada de caja negra —
// es lo que un gestor aprueba con un clic, así que cada propuesta explica su número.
//
// Todo en EUR (toEur) porque cash_position viene en divisa local. Un traspaso entre dos filiales
// de la misma divisa es "gratis" (corredor libre); entre divisas distintas paga spread FX.
import { FX, GEO, fxSpread, resolveCountry, toEur } from "./fx";
import { sane } from "./format";

export type EntityBase = {
  companyId: string;
  displayName: string;
  currency: string;
  country: string | null;
};

export type MonthRow = { month: string; score: number; regime: string | null; cashLocal: number | null };

export type Entity = EntityBase & {
  iso: string;
  countryInferred: boolean;
  countryName: string;
  lat: number;
  lon: number;
  score: number;
  regime: string | null;
  cashLocal: number | null;
  cashEur: number | null;
  role: "surplus" | "deficit" | "neutral";
  needEur: number; // cuánto le falta para estar cómoda (0 si no le falta)
  spareEur: number; // cuánto podría prestar sin quedarse justa (0 si no puede)
};

export type Proposal = {
  id: string;
  fromId: string;
  toId: string;
  amountEur: number;
  amountFromLocal: number;
  amountToLocal: number;
  sameCurrency: boolean;
  internalRate: number; // % anual, por score de quien recibe
  bankRate: number; // % anual que pagaría a un banco externo
  fxCostEur: number; // coste único del cruce de divisa
  savingEurYear: number; // ahorro anual de intereses vs banco
  urgency: "alta" | "media" | "baja";
};

export type Snapshot = {
  month: string;
  entities: Entity[];
  proposals: Proposal[];
  totals: { cashEur: number; surplusEur: number; deficitEur: number; nSurplus: number; nDeficit: number; nCurrencies: number };
};

export type Counterfactual = {
  months: number;
  bankInterestEur: number; // lo que las filiales en déficit habrían pagado a bancos
  poolInterestEur: number; // lo mismo, al tipo interno del grupo
  fxCostEur: number; // cruces de divisa necesarios
  netSavingEur: number;
};

const BUFFER_EUR = 25_000; // colchón mínimo que debe quedarle a una filial
const CASH_CAP_EUR = 5_000_000; // outliers sintéticos: por encima no nos lo creemos

/** Tipo interno: interpola entre 2 % (score 90+) y 6 % (score 40−), como negociaría un banco pero en vivo. */
export function rateForScore(score: number): number {
  const s = Math.max(40, Math.min(90, score));
  return Math.round((6 - ((s - 40) / 50) * 4) * 10) / 10;
}

/** Lo que le costaría a un banco externo: tipo interno + prima por riesgo, más cara cuanto peor el score. */
export function bankRateForScore(score: number): number {
  return Math.round((rateForScore(score) + 2.5 + Math.max(0, 65 - score) * 0.06) * 10) / 10;
}

export function buildEntities(base: EntityBase[], rows: Map<string, MonthRow>): Entity[] {
  return base.flatMap((b) => {
    const r = rows.get(b.companyId);
    if (!r) return [];
    const cashLocal = sane(r.cashLocal, CASH_CAP_EUR * (FX[b.currency]?.perEur ?? 1));
    const cashEur = toEur(cashLocal, b.currency);
    const { iso, inferred } = resolveCountry(b.country, b.currency);
    const g = GEO[iso];
    let role: Entity["role"] = "neutral";
    let needEur = 0;
    let spareEur = 0;
    if (cashEur !== null) {
      if (cashEur < 0 || (r.score < 55 && cashEur < BUFFER_EUR)) {
        role = "deficit";
        needEur = Math.max(0, BUFFER_EUR - cashEur);
      } else if (cashEur > 4 * BUFFER_EUR && r.score >= 60) {
        role = "surplus";
        spareEur = (cashEur - 2 * BUFFER_EUR) * 0.5; // presta hasta la mitad de lo que le sobra por encima de 2 colchones
      }
    }
    return [{ ...b, iso, countryInferred: inferred, countryName: g?.name ?? iso, lat: g?.lat ?? 0, lon: g?.lon ?? 0,
      score: r.score, regime: r.regime, cashLocal, cashEur, role, needEur, spareEur }];
  });
}

export function buildProposals(entities: Entity[], max = 6): Proposal[] {
  const lenders = entities.filter((e) => e.role === "surplus").map((e) => ({ e, left: e.spareEur }));
  const borrowers = entities.filter((e) => e.role === "deficit").sort((a, b) => b.needEur - a.needEur || a.score - b.score);
  const out: Proposal[] = [];
  for (const b of borrowers) {
    if (out.length >= max) break;
    let need = b.needEur;
    // primero corredores libres (misma divisa), luego el que más tenga
    const ranked = [...lenders].sort((x, y) => {
      const sx = x.e.currency === b.currency ? 1 : 0, sy = y.e.currency === b.currency ? 1 : 0;
      return sy - sx || y.left - x.left;
    });
    for (const l of ranked) {
      if (need <= 5_000 || out.length >= max) break;
      if (l.left < 5_000) continue;
      const amountEur = Math.round(Math.min(need, l.left) / 1000) * 1000;
      if (amountEur < 5_000) continue;
      const same = l.e.currency === b.currency;
      const internalRate = rateForScore(b.score);
      const bankRate = bankRateForScore(b.score);
      const fxCostEur = Math.round(amountEur * fxSpread(l.e.currency, b.currency));
      out.push({
        id: `${l.e.companyId}-${b.companyId}`,
        fromId: l.e.companyId,
        toId: b.companyId,
        amountEur,
        amountFromLocal: Math.round(amountEur * (FX[l.e.currency]?.perEur ?? 1)),
        amountToLocal: Math.round(amountEur * (FX[b.currency]?.perEur ?? 1)),
        sameCurrency: same,
        internalRate,
        bankRate,
        fxCostEur,
        savingEurYear: Math.round((amountEur * (bankRate - internalRate)) / 100),
        urgency: b.cashEur !== null && b.cashEur < 0 ? "alta" : b.score < 50 ? "media" : "baja",
      });
      l.left -= amountEur;
      need -= amountEur;
    }
  }
  return out;
}

export function snapshot(month: string, base: EntityBase[], rows: Map<string, MonthRow>): Snapshot {
  const entities = buildEntities(base, rows);
  const proposals = buildProposals(entities);
  const withCash = entities.filter((e) => e.cashEur !== null);
  return {
    month,
    entities,
    proposals,
    totals: {
      cashEur: withCash.reduce((s, e) => s + (e.cashEur ?? 0), 0),
      surplusEur: entities.filter((e) => e.role === "surplus").reduce((s, e) => s + e.spareEur, 0),
      deficitEur: entities.filter((e) => e.role === "deficit").reduce((s, e) => s + e.needEur, 0),
      nSurplus: entities.filter((e) => e.role === "surplus").length,
      nDeficit: entities.filter((e) => e.role === "deficit").length,
      nCurrencies: new Set(entities.map((e) => e.currency)).size,
    },
  };
}

/** Recorre todos los meses: cuánto habría costado financiar los déficits en el banco vs en el pool. */
export function counterfactual(snaps: Snapshot[]): Counterfactual {
  let bank = 0, pool = 0, fx = 0;
  for (const s of snaps) {
    for (const p of s.proposals) {
      bank += (p.amountEur * p.bankRate) / 100 / 12;
      pool += (p.amountEur * p.internalRate) / 100 / 12;
      fx += p.fxCostEur / 12; // se asume que el cruce se renueva ~una vez al año
    }
  }
  return { months: snaps.length, bankInterestEur: Math.round(bank), poolInterestEur: Math.round(pool), fxCostEur: Math.round(fx), netSavingEur: Math.round(bank - pool - fx) };
}
