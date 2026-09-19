/**
 * Producto 03 · Tesorería: reglas explícitas sobre el score real y las señales de caja del contrato de
 * datos. Nada de caja negra: cada propuesta dice con qué dato se ha activado.
 */
import type { Store } from "@/lib/data/store";
import type { CompanyIndex } from "@/lib/score/types";
import { tier, trend, type Tier, type Trend } from "@/lib/score/derived";
import { sane } from "@/lib/format";

export const RATE_DEPOSIT = 0.025;

export interface Excedente {
  companyId: string; name: string; score: number; tier: Tier; trend: Trend;
  cash: number; floor12: number; nMonths: number; share: number; amount: number; months: 3 | 6 | 12; product: string; yieldYear: number; reason: string;
}

function cashSeries(store: Store, id: string, month: string, n = 12): number[] {
  const ms = store.signalMonths.filter((m) => m <= month).slice(-n);
  return ms.map((m) => sane(store.signals.get(`${id}|${m}`)?.cash_position)).filter((v): v is number => v != null);
}

/** Colocación: suelo de caja de 12 meses × factor que fija el score y su dirección. */
export function excedente(store: Store, c: CompanyIndex, idx: number): Excedente | null {
  const month = store.months[idx];
  const s = c.scores[idx];
  if (s == null) return null;
  const series = cashSeries(store, c.id, month);
  if (series.length < 6) return null;
  const cash = series[series.length - 1];
  const floor12 = Math.min(...series);
  if (floor12 < 100_000) return null;
  const t = tier(s), tr = trend(c.scores, idx);
  let share = t === "prime" ? 0.8 : t === "healthy" ? 0.6 : s >= 55 ? 0.35 : 0;
  if (tr === "deteriorating") share *= 0.5;
  if ((c.stress[idx] ?? 0) > 0) share *= 0.5;
  const amount = Math.floor((floor12 * share) / 10_000) * 10_000;
  if (amount < 50_000) return null;
  const months: 3 | 6 | 12 = tr === "improving" && t !== "watch" ? 12 : tr === "deteriorating" ? 3 : 6;
  const product = months >= 6 ? "Depósito a plazo" : "Fondo monetario";
  const reason = `${series.length} meses sin bajar de ${Math.round(floor12 / 1000)} k€; score ${s.toFixed(0)} ${tr === "improving" ? "y mejorando" : tr === "deteriorating" ? "pero cayendo" : "estable"} → se inmoviliza el ${Math.round(share * 100)} % del suelo a ${months} meses.`;
  return { companyId: c.id, name: c.name, score: s, tier: t, trend: tr, cash, floor12, nMonths: series.length, share, amount, months, product, yieldYear: Math.round(amount * RATE_DEPOSIT), reason };
}

export interface Cuota {
  companyId: string; name: string; score: number; trend: Trend; cash: number | null; runway: number | null; debtService: number | null; net: number | null;
  level: "alta" | "media" | "ok"; advice: string;
}

/** Alerta de cuotas: cuotas + intereses del mes frente a la caja prevista (señales debt_service_ratio, runway, net_cash_flow). */
export function cuota(store: Store, c: CompanyIndex, idx: number): Cuota | null {
  const month = store.months[idx];
  const s = c.scores[idx];
  const sig = store.signals.get(`${c.id}|${month}`);
  if (s == null || !sig) return null;
  const debt = sig.debt_service_ratio;
  if (debt == null || debt <= 0) return null;
  const cash = sane(sig.cash_position), runway = sig.runway_months, net = sane(sig.net_cash_flow);
  const tr = trend(c.scores, idx);
  let level: Cuota["level"] = "ok";
  if ((runway != null && runway < 3) || debt > 0.5 || (cash != null && cash < 0)) level = "alta";
  else if ((runway != null && runway < 6) || debt > 0.25 || (net != null && net < 0 && s < 55)) level = "media";
  const advice = level === "alta"
    ? (s >= 60 ? "Dispón de la póliza el día 3 y cubre el trimestre; el score aguanta." : "Mueve caja del grupo o renegocia el vencimiento ahora, no en el mes de la cuota.")
    : level === "media" ? "Reserva el importe de las cuotas del trimestre antes de aprobar pagos discrecionales." : "Cuotas cubiertas con la caja prevista.";
  return { companyId: c.id, name: c.name, score: s, trend: tr, cash, runway, debtService: debt, net, level, advice };
}

export interface PagoReco { companyId: string; name: string; score: number; trend: Trend; dpo: number | null; retraso: number | null; cash: number | null; runway: number | null; mode: "adelantar" | "vencimiento" | "ultimo_dia"; reason: string; savingHint: string }

/** Recomendación de pagos a proveedores según el score: adelantar y pedir descuento, o pagar el último día y nunca después. */
export function pagos(store: Store, c: CompanyIndex, idx: number): PagoReco | null {
  const month = store.months[idx];
  const s = c.scores[idx];
  const sig = store.signals.get(`${c.id}|${month}`);
  if (s == null || !sig) return null;
  const retraso = c.latest.metrics.retraso_pago;
  const cash = sane(sig.cash_position), runway = sig.runway_months;
  const tr = trend(c.scores, idx);
  let mode: PagoReco["mode"] = "vencimiento";
  if (s >= 70 && tr !== "deteriorating" && (runway == null || runway >= 12) && (cash ?? 0) > 200_000) mode = "adelantar";
  else if (s < 55 || tr === "deteriorating" || (runway != null && runway < 6)) mode = "ultimo_dia";
  const reason = mode === "adelantar"
    ? `Score ${s.toFixed(0)}, runway ${runway == null ? "amplio" : `${runway.toFixed(0)} m`} y caja de ${Math.round((cash ?? 0) / 1000)} k€: sobra liquidez para adelantar las facturas grandes a cambio de descuento.`
    : mode === "ultimo_dia"
      ? `Score ${s.toFixed(0)}${tr === "deteriorating" ? " y cayendo" : ""}: paga el último día de plazo y nunca después; estirar el pago a proveedores es la primera señal de deterioro que ve un banco${retraso != null && retraso > 0 ? ` (ya pagas ${Math.round(retraso)} d tarde)` : ""}.`
      : "Sin holgura para adelantar ni tensión para estirar: paga al vencimiento.";
  const savingHint = mode === "adelantar" ? "Descuento por pronto pago típico: 1–2 % a 20 días (18–36 % anualizado)." : mode === "ultimo_dia" ? "Cada día de retraso penaliza A1/A2 y, con racha ≥ 3, enciende la alarma S6." : "Mantén el DPO estable: es lo que el score premia.";
  return { companyId: c.id, name: c.name, score: s, trend: tr, dpo: sig.dpo_days, retraso, cash, runway, mode, reason, savingHint };
}
