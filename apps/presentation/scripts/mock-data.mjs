// Generador de datos de ejemplo para desarrollar la web.
// Escribe apps/web/public/data/{overview,companies,groups}.json y company/COMP_xxxx.json
// siguiendo el mismo esquema que el generador real (Python), que sobreescribirá estos ficheros.
//
// Uso: node apps/web/scripts/mock-data.mjs

import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "public", "data");

// ---------- RNG determinista ----------
let seed = 20260919;
function rnd() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
const r = (a, b) => a + (b - a) * rnd();
const ri = (a, b) => Math.floor(r(a, b + 1));
const pick = (arr) => arr[ri(0, arr.length - 1)];
const round = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---------- calendario ----------
const N_MONTHS = 24;
const MONTHS = [];
{
  let y = 2024, m = 9;
  for (let i = 0; i < N_MONTHS; i++) {
    MONTHS.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
}
const MONTH_LAST = MONTHS[MONTHS.length - 1]; // 2026-08
const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const monthName = (m) => MONTH_NAMES[parseInt(m.slice(5), 10) - 1];

const BANKS = ["Banco Santander", "BBVA", "CaixaBank", "Sabadell", "Bankinter", "Unicaja", "Abanca", "Kutxabank"];
const DIMS = ["pago", "liquidez", "caja", "deuda", "concentracion"];
const DIM_LABEL = { pago: "pago", liquidez: "liquidez", caja: "caja", deuda: "deuda", concentracion: "concentración" };

const fmtPts = (x) => String(round(Math.abs(x), 1)).replace(".", ",");
const fmtEur = (x) => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(x) + " €";

// ---------- grupos ----------
const GROUP_SIZES = [3, 4, 5, 6, 7, 5, 6, 4]; // = 40 empresas
const N_COMP = GROUP_SIZES.reduce((a, b) => a + b, 0);

const groupsMeta = [];
let compIdx = 1;
GROUP_SIZES.forEach((size, gi) => {
  const id = `GROUP_${String(gi + 1).padStart(4, "0")}`;
  const members = [];
  for (let k = 0; k < size; k++) members.push(`COMP_${String(compIdx++).padStart(4, "0")}`);
  groupsMeta.push({ id, size, members });
});

// ---------- empresas ----------
// Arquetipos de trayectoria para que haya de todo en la demo
const ARCHETYPES = ["sano", "mejora", "torciendo", "rojo", "estable_ambar"];

function tierOf(s) { return s >= 70 ? "verde" : s >= 40 ? "ambar" : "rojo"; }
function trendOf(d3) { return d3 > 3 ? "mejora" : d3 < -3 ? "empeora" : "estable"; }

function buildCompany(id, group) {
  const arche = ARCHETYPES[(parseInt(id.slice(5), 10) - 1) % ARCHETYPES.length];
  const firstIdx = rnd() < 0.7 ? 0 : ri(1, 10);
  const first_month = MONTHS[firstIdx];
  const nMonths = N_MONTHS - firstIdx;

  // trayectoria del score
  let start, drift;
  if (arche === "sano") { start = r(72, 88); drift = r(-0.2, 0.3); }
  else if (arche === "mejora") { start = r(35, 55); drift = r(0.9, 1.8); }
  else if (arche === "torciendo") { start = r(68, 82); drift = r(-1.6, -0.8); }
  else if (arche === "rojo") { start = r(40, 55); drift = r(-1.4, -0.6); }
  else { start = r(45, 62); drift = r(-0.3, 0.3); }

  const scores = [];
  let s = start;
  for (let i = 0; i < nMonths; i++) {
    s = clamp(s + drift + r(-3, 3), 3, 98);
    scores.push(round(s, 1));
  }

  // flujos
  const scale = pick([0.4, 0.8, 1.5, 3, 6]) * 1e5; // tamaño de la empresa
  const has_debt = rnd() < 0.7;
  const monthsOut = [];
  let balance = scale * r(1.5, 4);
  const events = [];
  let alertStreak = 0;
  let firstAlert = null, firstEvent = null;

  for (let i = 0; i < nMonths; i++) {
    const m = MONTHS[firstIdx + i];
    const sc = scores[i];
    const health = (sc - 50) / 50; // -1..1
    const inflow = round(scale * r(0.9, 1.3) * (1 + 0.25 * health), 0);
    const outflow = round(inflow * r(0.9, 1.1) * (1 - 0.15 * health), 0);
    const net = inflow - outflow;
    balance = balance + net;
    const balance_eom = round(balance, 0);
    const balance_min = round(balance - Math.abs(net) * r(0.5, 1.5) - scale * r(0.05, 0.3), 0);
    const dpo = round(30 + (50 - sc) * 0.6 + r(-4, 4), 0);
    const dso = round(35 + (50 - sc) * 0.4 + r(-4, 4), 0);
    const overdue_share = round(clamp(0.08 + (50 - sc) / 200 + r(-0.03, 0.03), 0, 0.6), 3);
    const retraso_pago = round(clamp(2 + (50 - sc) * 0.25 + r(-1.5, 1.5), 0, 40), 1);
    const devoluciones = sc < 40 && rnd() < 0.4 ? ri(1, 4) : 0;
    const servicio_deuda = has_debt ? round(clamp(0.08 + (55 - sc) / 150 + r(-0.03, 0.03), 0.02, 0.9), 3) : 0;
    const burn = Math.max(1, outflow - inflow);
    const runway = round(clamp(balance_eom / burn, 0, 36), 1);

    // contribuciones: suman score - 50, repartidas con pesos por dimensión
    const w = [r(0.2, 0.4), r(0.25, 0.45), r(0.1, 0.25), has_debt ? r(0.1, 0.25) : r(0.02, 0.06), r(0.03, 0.1)];
    const wsum = w.reduce((a, b) => a + b, 0);
    const total = sc - 50;
    const c = {};
    DIMS.forEach((d, k) => {
      const noise = r(-3, 3);
      c[d] = round((total * w[k]) / wsum + noise, 1);
    });
    // corrige para que sumen exactamente total
    const csum = DIMS.reduce((a, d) => a + c[d], 0);
    c.liquidez = round(c.liquidez + (total - csum), 1);

    // alerta: score < 45 y cayendo, o score < 35
    const prev = i > 0 ? scores[i - 1] : sc;
    const alert = (sc < 45 && sc < prev - 1) || sc < 35 || (sc < 55 && runway < 2) ? 1 : 0;
    if (alert) { alertStreak++; if (!firstAlert) firstAlert = m; } else alertStreak = 0;

    // explicación
    const i3 = Math.max(0, i - 3);
    const d3 = sc - scores[i3];
    let explanation;
    if (i < 3) explanation = `primer trimestre observado: ${tierOf(sc)}`;
    else {
      // dimensión que más cambió
      const prevC = monthsOut[i3].c;
      let best = DIMS[0], bestAbs = -1;
      for (const d of DIMS) { const dd = Math.abs(c[d] - prevC[d]); if (dd > bestAbs) { bestAbs = dd; best = d; } }
      if (Math.abs(d3) < 1.5) explanation = `estable en ${tierOf(sc)}: sin cambios relevantes`;
      else explanation = `${d3 > 0 ? "subió" : "bajó"} ${fmtPts(d3)} pts: ${DIM_LABEL[best]}`;
    }

    // eventos (impago / descubierto) en empresas mal
    if (sc < 38 && alertStreak >= 2 && rnd() < 0.5 && !firstEvent) {
      firstEvent = m;
      events.push({ m, event: 1, D1: rnd() < 0.6 ? 1 : 0, D2: rnd() < 0.4 ? 1 : 0, D3: rnd() < 0.3 ? 1 : 0, D4: rnd() < 0.3 ? 1 : 0, cure: 0 });
      if (!events[events.length - 1].D1 && !events[events.length - 1].D2) events[events.length - 1].D1 = 1;
    } else if (firstEvent && sc > 50 && rnd() < 0.5 && !events.some((e) => e.cure)) {
      events.push({ m, event: 0, D1: 0, D2: 0, D3: 0, D4: 0, cure: 1 });
    }

    monthsOut.push({
      m, score: sc, c, alert, explanation,
      inflow, outflow, net, balance_eom, balance_min,
      dpo, dso, overdue_share, retraso_pago, devoluciones, servicio_deuda, runway,
    });
  }

  const last = monthsOut[monthsOut.length - 1];
  const m3 = monthsOut[Math.max(0, monthsOut.length - 4)];
  const m6 = monthsOut[Math.max(0, monthsOut.length - 7)];
  const score = last.score;
  const score_3m = m3.score;
  const score_6m = m6.score;
  const delta3 = round(score - score_3m, 1);
  const delta6 = round(score - score_6m, 1);
  const tier = tierOf(score);
  const trend = trendOf(delta3);
  const cash = last.balance_eom;

  // anticipación
  let anticipation = null;
  if (firstAlert && firstEvent) {
    const ia = MONTHS.indexOf(firstAlert), ie = MONTHS.indexOf(firstEvent);
    anticipation = { first_alert_month: firstAlert, first_event_month: firstEvent, lead_months: Math.max(0, ie - ia) };
  }

  // productos
  const n_bank = ri(1, 4);
  const banks = [];
  while (banks.length < n_bank) { const b = pick(BANKS); if (!banks.includes(b)) banks.push(b); }
  const credit_lines = has_debt
    ? banks.slice(0, ri(1, Math.min(2, n_bank))).map((bank) => {
        const granted = Math.round(scale * r(1, 4) / 10000) * 10000;
        const drawn = Math.round(granted * clamp(0.2 + (60 - score) / 100 + r(-0.1, 0.1), 0, 1) / 1000) * 1000;
        return { bank, granted, drawn };
      })
    : [];
  const products = { n_bank, n_debt: credit_lines.length, banks, has_investment: rnd() < 0.3, credit_lines };
  const drawn = credit_lines.reduce((a, l) => a + l.drawn, 0);

  // explicación v2: colchón (runway) hace 3 meses -> ahora
  const cushionThen = round(m3.balance_min / Math.max(1, m3.outflow), 2);
  const cushionNow = round(last.balance_min / Math.max(1, last.outflow), 2);
  const explanation_v2 = `colchón ${String(cushionThen).replace(".", ",")} → ${String(cushionNow).replace(".", ",")}`;

  // tarjeta excedentes
  const last6 = monthsOut.slice(-6), last12 = monthsOut.slice(-12);
  const floor6 = Math.min(...last6.map((x) => x.balance_min));
  const floor12 = Math.min(...last12.map((x) => x.balance_min));
  let excedentes = null;
  if (score >= 55 && floor6 > scale * 0.5 && trend !== "empeora") {
    const share = score >= 70 ? 0.8 : 0.5;
    const horizon_months = score >= 70 && trend === "estable" ? 12 : 6;
    const rate = horizon_months === 12 ? 0.028 : 0.025;
    const proposal = Math.round((floor12 * share) / 10000) * 10000;
    excedentes = {
      floor6, floor12, proposal, horizon_months, rate,
      yield_yearly: Math.round(proposal * rate),
      reason: `Score ${Math.round(score)} y ${trend === "mejora" ? "mejorando" : "estable"}: puede colocar el ${share * 100}% de su suelo a ${horizon_months} meses`,
    };
  }

  // monitor: alertas
  const alertas = [];
  if (has_debt && last.servicio_deuda > 0.2 && score < 60) {
    const svc = Math.round(last.outflow * last.servicio_deuda * 3);
    const cajaPrev = Math.round(last.balance_min * r(0.6, 0.9));
    const idx = (parseInt(MONTH_LAST.slice(5), 10) - 1 + 3) % 12;
    alertas.push({
      type: "cuotas", severity: svc > cajaPrev ? "alta" : "media", month: MONTH_LAST,
      title: `Cuotas de ${MONTH_NAMES[idx]} no cubiertas`,
      text: `Servicio de deuda de 3 meses ${fmtEur(svc)} frente a caja prevista ${fmtEur(cajaPrev)}. Dispón de la póliza el día 3.`,
      months_ahead: 3,
    });
  }
  const dRetraso = round(last.retraso_pago - m6.retraso_pago, 0);
  if (dRetraso >= 5) {
    alertas.push({
      type: "proveedores", severity: dRetraso >= 12 ? "alta" : "media", month: MONTH_LAST,
      title: `Estás pagando ${dRetraso} días más tarde que en ${monthName(m6.m)}`,
      text: `Retraso medio a proveedores ${String(last.retraso_pago).replace(".", ",")} días (antes ${String(m6.retraso_pago).replace(".", ",")}). Es la señal más temprana de estrés: revisa los pagos de la próxima semana.`,
      months_ahead: 0,
    });
  }
  if (last.overdue_share > 0.25) {
    alertas.push({
      type: "cobros", severity: last.overdue_share > 0.35 ? "alta" : "media", month: MONTH_LAST,
      title: `El ${Math.round(last.overdue_share * 100)}% de los cobros está vencido`,
      text: `Tus clientes te están financiando al revés. Prioriza la reclamación de las 5 facturas mayores.`,
      months_ahead: 0,
    });
  }
  if (last.runway < 3 && last.net < 0) {
    alertas.push({
      type: "caja", severity: last.runway < 1.5 ? "alta" : "media", month: MONTH_LAST,
      title: `Caja para ${String(last.runway).replace(".", ",")} meses al ritmo actual`,
      text: `Saldo mínimo ${fmtEur(last.balance_min)} con neto mensual ${fmtEur(last.net)}.`,
      months_ahead: Math.max(1, Math.round(last.runway)),
    });
  }
  if (credit_lines.some((l) => l.drawn / l.granted > 0.9)) {
    alertas.push({
      type: "lineas", severity: "baja", month: MONTH_LAST,
      title: "Líneas de crédito al 90 %",
      text: "Ya no queda red. Negocia ampliación antes del cierre de trimestre.",
      months_ahead: 1,
    });
  }

  const summary = {
    id, group_id: group.id, group_size: group.size, country: "ES", currency: "EUR",
    score, score_3m, score_6m, delta3, delta6, tier, trend, alert: last.alert,
    explanation: last.explanation,
    c: last.c, cash, has_debt, first_month,
  };
  const detail = {
    id, group_id: group.id, group_size: group.size, country: "ES", currency: "EUR",
    months: monthsOut, events, anticipation, explanation_v2, products,
    cards: { excedentes, pooling: null, alertas },
  };
  return { summary, detail, drawn, scale };
}

const companies = [];
const details = {};
const extra = {};
for (const g of groupsMeta) {
  for (const id of g.members) {
    const { summary, detail, drawn, scale } = buildCompany(id, g);
    companies.push(summary);
    details[id] = detail;
    extra[id] = { drawn, scale };
  }
}

// ---------- pooling por grupo ----------
const groups = [];
for (const g of groupsMeta) {
  const members = g.members.map((id) => {
    const c = companies.find((x) => x.id === id);
    return { id, score: Math.round(c.score), cash: c.cash, drawn: extra[id].drawn };
  });
  const surplus = members.filter((m) => m.cash > 0).reduce((a, m) => a + m.cash, 0);
  const overdraft = members.filter((m) => m.cash < 0).reduce((a, m) => a - m.cash, 0);
  const drawn = members.reduce((a, m) => a + m.drawn, 0);
  const nettable = Math.min(surplus, drawn + overdraft);
  const pooling = g.size >= 3 && nettable > 50000;

  const proposals = [];
  if (pooling) {
    const donors = members.filter((m) => m.cash > 0 && m.score >= 55).sort((a, b) => b.cash - a.cash);
    const takers = members.filter((m) => m.drawn > 0 || m.cash < 0).sort((a, b) => a.score - b.score);
    for (const t of takers) {
      const donor = donors.find((d) => d.id !== t.id);
      if (!donor) break;
      const need = t.drawn + Math.max(0, -t.cash);
      const cap = t.score < 40 ? 0.3 : t.score < 55 ? 0.5 : 0.8;
      const limit = Math.round((need * cap) / 10000) * 10000;
      const amount = Math.min(limit, Math.round((donor.cash * 0.4) / 10000) * 10000);
      if (amount <= 0) continue;
      donor.cash -= amount;
      const cs = companies.find((x) => x.id === t.id);
      proposals.push({
        from: donor.id, to: t.id, amount, limit, rate_internal: 0.03,
        reason: `Score ${t.score} y ${cs.trend === "empeora" ? "bajando" : cs.trend === "mejora" ? "subiendo" : "estable"}: límite al ${cap * 100}% de lo dispuesto`,
      });
    }
  }
  const totalProp = proposals.reduce((a, p) => a + p.amount, 0);
  const saving_yearly = Math.round(totalProp * (0.055 - 0.03));
  const membersOut = g.members.map((id) => {
    const c = companies.find((x) => x.id === id);
    return { id, score: Math.round(c.score), cash: c.cash, drawn: extra[id].drawn };
  });
  for (const id of g.members) {
    details[id].cards.pooling = pooling ? { group_id: g.id, members: membersOut, proposals, saving_yearly } : null;
  }
  groups.push({ id: g.id, size: g.size, members: g.members, surplus, drawn, overdraft, nettable, pooling });
}

// ---------- overview ----------
const buckets = Array.from({ length: 10 }, (_, i) => ({ bucket: `${i * 10}-${i * 10 + 10}`, n: 0 }));
for (const c of companies) buckets[Math.min(9, Math.floor(c.score / 10))].n++;
const counts = {
  verde: companies.filter((c) => c.tier === "verde").length,
  ambar: companies.filter((c) => c.tier === "ambar").length,
  rojo: companies.filter((c) => c.tier === "rojo").length,
  mejorando: companies.filter((c) => c.trend === "mejora").length,
  empeorando: companies.filter((c) => c.trend === "empeora").length,
  alertas: companies.filter((c) => c.alert === 1).length,
};
const overview = {
  month_last: MONTH_LAST,
  n_companies: companies.length,
  n_groups: groups.length,
  n_tx: 2556437,
  n_invoices: 897894,
  months: N_MONTHS,
  windows: [
    { key: "caja", title: "Por la caja", value: "2.460 M€", detail: "535 M€ llevan un año sin moverse" },
    { key: "cobros", title: "Por los cobros", value: "31 días", detail: "El 18 % de las facturas vence sin cobrarse" },
    { key: "pagos", title: "Por los pagos", value: "+6 días", detail: "142 empresas pagan más tarde cada mes" },
    { key: "deuda", title: "Por la deuda", value: "1.120 M€", detail: "97 líneas de crédito por encima del 90 %" },
    { key: "nominas", title: "Por las nóminas e impuestos", value: "63", detail: "empresas con un mes sin nómina o sin Hacienda" },
    { key: "bancos", title: "Por los bancos", value: "3,1", detail: "bancos por empresa; comisiones +22 % interanual" },
    { key: "clientes", title: "Por los clientes compartidos", value: "42.000", detail: "contrapartes cruzadas: un bureau casero" },
  ],
  score_hist: buckets,
  counts,
};

// ---------- escribir ----------
rmSync(join(OUT, "company"), { recursive: true, force: true });
mkdirSync(join(OUT, "company"), { recursive: true });
writeFileSync(join(OUT, "overview.json"), JSON.stringify(overview, null, 1));
writeFileSync(join(OUT, "companies.json"), JSON.stringify(companies));
writeFileSync(join(OUT, "groups.json"), JSON.stringify(groups, null, 1));
for (const [id, d] of Object.entries(details)) writeFileSync(join(OUT, "company", `${id}.json`), JSON.stringify(d));

console.log(`escritos ${companies.length} empresas y ${groups.length} grupos en ${OUT}`);
console.log(counts);
