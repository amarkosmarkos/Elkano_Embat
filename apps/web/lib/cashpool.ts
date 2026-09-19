// Motor de cash pooling: reglas explícitas sobre datos reales de un grupo. Nada de caja negra —
// es lo que un gestor aprueba con un clic, así que cada propuesta explica su número.
import { FX, toEur } from "./fx";

export type EntityBase = {
  companyId: string;
  currency: string;
  country: string | null;
};

export type PoolSettings = {
  days: number;
  bankRate: number;
  depositRate: number;
  transferFeeEur: number;
  reserveEur: number;
};

export const DEFAULT_SETTINGS: PoolSettings = {
  days: 30,
  bankRate: 6,
  depositRate: 2,
  transferFeeEur: 10,
  reserveEur: 25_000,
};

export type SeriesRow = {
  companyId: string;
  month: string;
  score: number;
  cashLocal: number | null;
  explanation: string | null;
};

export type MonthRow = Omit<SeriesRow, "companyId"> & {
  delta1m: number | null;
  delta3m: number | null;
  recentDrawdownEur: number;
};

export type Trend = "improving" | "stable" | "dip" | "deteriorating" | "unknown";
export type Decision = "approved" | "rejected";
export type Entity = EntityBase & {
  score: number | null;
  cashLocal: number | null;
  cashEur: number | null;
  delta3m: number | null;
  trend: Trend;
  explanation: string | null;
  role: "surplus" | "deficit" | "neutral" | "unknown";
  policy: "available" | "limited" | "review" | "none";
  reason: string;
  reserveEur: number;
  recentDrawdownEur: number;
  needEur: number; // cuánto le falta para estar cómoda (0 si no le falta)
  spareEur: number; // cuánto podría prestar sin quedarse justa (0 si no puede)
  receiveLimitEur: number;
};

export type Proposal = {
  id: string;
  month: string;
  fromId: string;
  toId: string;
  currency: string;
  amountLocal: number;
  amountEur: number;
  days: number;
  bankInterestEur: number;
  opportunityCostEur: number;
  feeEur: number;
  netSavingEur: number;
  donorAfterEur: number;
  receiverAfterEur: number;
  donorReserveEur: number;
  receiverReserveEur: number;
  reason: string;
  requiresReview: boolean;
};

export type Snapshot = {
  month: string;
  entities: Entity[];
  proposals: Proposal[];
  totals: { cashEur: number; surplusEur: number; deficitEur: number; unknown: number };
};

const CASH_CAP_EUR = 5_000_000; // outliers sintéticos: por encima no nos lo creemos
const MIN_TRANSFER_EUR = 1_000;

function cashInEur(cash: number | null | undefined, currency: string): number | null {
  const converted = toEur(cash, currency);
  return converted !== null && Math.abs(converted) <= CASH_CAP_EUR ? converted : null;
}

function validScore(score: number | null | undefined): score is number {
  return score != null && Number.isFinite(score) && score >= 0 && score <= 100;
}

function trendFor(row?: MonthRow): Trend {
  if (!row || !validScore(row.score) || row.delta3m === null || !Number.isFinite(row.delta3m)) return "unknown";
  if (row.delta3m <= -6) return "deteriorating";
  if (row.delta3m >= 6) return "improving";
  if (row.delta1m !== null && row.delta1m <= -8) return "dip";
  return "stable";
}

function validateSettings(s: PoolSettings) {
  if (!Number.isInteger(s.days) || s.days < 1 || s.days > 90 ||
      !Number.isFinite(s.bankRate) || s.bankRate < 0 || s.bankRate > 30 ||
      !Number.isFinite(s.depositRate) || s.depositRate < 0 || s.depositRate > 30 ||
      !Number.isFinite(s.transferFeeEur) || s.transferFeeEur < 0 || s.transferFeeEur > 10_000 ||
      !Number.isFinite(s.reserveEur) || s.reserveEur < 0 || s.reserveEur > 1_000_000) {
    throw new Error("Supuestos de simulación fuera de rango");
  }
}

export function buildEntities(base: EntityBase[], rows: Map<string, MonthRow>, settings: PoolSettings): Entity[] {
  return base.map((b) => {
    const r = rows.get(b.companyId);
    const cashEur = cashInEur(r?.cashLocal, b.currency);
    const score = validScore(r?.score) ? r.score : null;
    const trend = trendFor(r);
    const recentDrawdownEur = Math.max(0, r?.recentDrawdownEur ?? 0);
    const reserveEur = Math.max(settings.reserveEur, recentDrawdownEur * settings.days / 30);
    const needEur = cashEur === null ? 0 : Math.max(0, reserveEur - cashEur);
    let spareEur = 0;
    let receiveLimitEur = 0;
    let role: Entity["role"] = cashEur === null || score === null ? "unknown" : needEur > 0 ? "deficit" : "neutral";
    let policy: Entity["policy"] = "none";
    let reason = "La caja cubre la reserva de este escenario; no necesita financiación interna.";

    if (role === "unknown") {
      policy = "review";
      reason = "Saldo o score ausente, fuera de rango o sin conversión conocida. Excluida del plan; no equivale a caja cero.";
    } else if (trend === "unknown") {
      policy = "review";
      reason = "Falta un score comparable de hace tres meses. Revisar la historia antes de proponer una operación.";
    } else if (trend === "deteriorating" || score! < 40) {
      policy = "review";
      reason = trend === "deteriorating"
        ? "El score cae al menos 6 puntos en tres meses. No se propone nueva exposición ni se moviliza su caja sin revisión."
        : "Score inferior a 40. Necesita una revisión específica, no financiación automática.";
    } else if (needEur > 0) {
      const fraction = trend === "dip" ? 0.5 : trend === "improving" ? 0.75 : score! >= 60 ? 1 : 0.5;
      receiveLimitEur = needEur * fraction;
      policy = fraction < 1 ? "limited" : "available";
      reason = trend === "dip"
        ? "Posible bache: caída mensual de 8 puntos o más sin caída sostenida de 6 puntos a tres meses. Cobertura limitada al 50 %; revisar la causa."
        : trend === "improving"
          ? "Mejora de al menos 6 puntos en tres meses. Se permite una cobertura gradual de hasta el 75 % de la necesidad."
          : fraction === 1
            ? "Trayectoria estable y score de al menos 60. Se puede cubrir la necesidad hasta la reserva, si hay liquidez compatible."
            : "Trayectoria estable con score entre 40 y 60. Se limita la cobertura al 50 % de la necesidad.";
    } else if (score! >= 60 && trend !== "dip" && cashEur! > reserveEur) {
      spareEur = (cashEur! - reserveEur) * 0.5;
      role = "surplus";
      policy = "available";
      reason = "Score de al menos 60 sin deterioro ni bache. Moviliza como máximo el 50 % del excedente sobre su reserva, incluyendo comisiones.";
    } else if (cashEur! > reserveEur) {
      policy = "review";
      reason = "Tiene caja sobre la reserva, pero su score o posible bache aconsejan conservarla hasta una revisión.";
    }

    return { ...b, score, cashEur, cashLocal: cashEur === null ? null : r!.cashLocal,
      delta3m: r?.delta3m ?? null, trend, explanation: r?.explanation ?? null, role, policy, reason,
      reserveEur, recentDrawdownEur, needEur, spareEur, receiveLimitEur };
  });
}

export function buildProposals(month: string, entities: Entity[], settings: PoolSettings): Proposal[] {
  const lenders = entities.filter((e) => e.spareEur > 0).map((e) => ({ e, left: e.spareEur, debit: 0 }));
  const borrowers = entities.filter((e) => e.receiveLimitEur > 0)
    .sort((a, b) => b.receiveLimitEur - a.receiveLimitEur || a.companyId.localeCompare(b.companyId));
  const out: Proposal[] = [];
  for (const b of borrowers) {
    let remaining = b.receiveLimitEur;
    let credit = 0;
    const ranked = lenders.filter((l) => l.e.currency === b.currency && l.e.companyId !== b.companyId)
      .sort((a, b) => b.left - a.left || a.e.companyId.localeCompare(b.e.companyId));
    for (const l of ranked) {
      const fx = FX[b.currency].perEur;
      const amountLocal = Math.floor(Math.max(0, Math.min(remaining, l.left - settings.transferFeeEur)) * fx / 100) * 100;
      const amountEur = amountLocal / fx;
      if (amountEur < MIN_TRANSFER_EUR) continue;
      const bankInterestEur = amountEur * (settings.bankRate / 100) * settings.days / 365;
      const opportunityCostEur = amountEur * (settings.depositRate / 100) * settings.days / 365;
      const netSavingEur = bankInterestEur - opportunityCostEur - settings.transferFeeEur;
      if (netSavingEur <= 0) continue;
      l.left -= amountEur + settings.transferFeeEur;
      l.debit += amountEur + settings.transferFeeEur;
      remaining -= amountEur;
      credit += amountEur;
      const donorAfterEur = l.e.cashEur! - l.debit;
      const receiverAfterEur = b.cashEur! + credit;
      out.push({
        id: JSON.stringify([month, l.e.companyId, b.companyId, amountLocal, settings.days, settings.bankRate,
          settings.depositRate, settings.transferFeeEur, settings.reserveEur, l.e.score, b.score,
          l.e.delta3m, b.delta3m, l.e.trend, b.trend, donorAfterEur, receiverAfterEur, l.e.reserveEur, b.reserveEur]),
        month, fromId: l.e.companyId, toId: b.companyId, currency: b.currency, amountLocal, amountEur,
        days: settings.days, bankInterestEur, opportunityCostEur, feeEur: settings.transferFeeEur, netSavingEur,
        donorAfterEur, receiverAfterEur, donorReserveEur: l.e.reserveEur, receiverReserveEur: b.reserveEur,
        reason: b.reason, requiresReview: b.policy === "limited",
      });
    }
  }
  return out;
}

export function snapshot(month: string, base: EntityBase[], rows: Map<string, MonthRow>, settings: PoolSettings = DEFAULT_SETTINGS): Snapshot {
  validateSettings(settings);
  const entities = buildEntities(base, rows, settings);
  return {
    month, entities, proposals: buildProposals(month, entities, settings),
    totals: {
      cashEur: entities.reduce((s, e) => s + (e.cashEur ?? 0), 0),
      surplusEur: entities.reduce((s, e) => s + e.spareEur, 0),
      deficitEur: entities.reduce((s, e) => s + e.needEur, 0),
      unknown: entities.filter((e) => e.role === "unknown").length,
    },
  };
}

function previousMonth(month: string, n: number) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, m - 1 - n, 1));
  return date.toISOString().slice(0, 7);
}

export function buildSeries(base: EntityBase[], rows: SeriesRow[], settings: PoolSettings = DEFAULT_SETTINGS): Snapshot[] {
  const months = Array.from(new Set(rows.map((r) => r.month))).sort();
  const byCompany = new Map<string, Map<string, SeriesRow>>();
  for (const r of rows) {
    if (!byCompany.has(r.companyId)) byCompany.set(r.companyId, new Map());
    byCompany.get(r.companyId)!.set(r.month, r);
  }
  return months.map((month) => {
    const monthly = new Map<string, MonthRow>();
    for (const b of base) {
      const history = byCompany.get(b.companyId);
      const r = history?.get(month);
      if (!r) continue;
      const delta = (n: number) => {
        const past = history?.get(previousMonth(month, n));
        return validScore(r.score) && validScore(past?.score) ? r.score - past.score : null;
      };
      let recentDrawdownEur = 0;
      for (let i = 0; i < 3; i++) {
        const current = cashInEur(history?.get(previousMonth(month, i))?.cashLocal, b.currency);
        const previous = cashInEur(history?.get(previousMonth(month, i + 1))?.cashLocal, b.currency);
        if (current !== null && previous !== null) recentDrawdownEur = Math.max(recentDrawdownEur, previous - current);
      }
      monthly.set(b.companyId, { ...r, delta1m: delta(1), delta3m: delta(3), recentDrawdownEur });
    }
    return snapshot(month, base, monthly, settings);
  });
}

export function summarize(s: Snapshot, decisions: Record<string, Decision>) {
  const active = s.proposals.filter((p) => decisions[p.id] !== "rejected");
  const approved = active.filter((p) => decisions[p.id] === "approved");
  const sum = (rows: Proposal[], key: "amountEur" | "netSavingEur" | "bankInterestEur" | "opportunityCostEur" | "feeEur") => rows.reduce((n, p) => n + p[key], 0);
  return {
    pending: active.length - approved.length,
    proposedEur: sum(active, "amountEur"),
    approvedEur: sum(approved, "amountEur"),
    approvedSavingEur: sum(approved, "netSavingEur"),
    netSavingEur: sum(active, "netSavingEur"),
    bankInterestEur: sum(active, "bankInterestEur"),
    opportunityCostEur: sum(active, "opportunityCostEur"),
    feeEur: sum(active, "feeEur"),
    uncoveredEur: Math.max(0, s.totals.deficitEur - sum(active, "amountEur")),
  };
}
