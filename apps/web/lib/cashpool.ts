// Motor de propuestas de cash pooling: reglas explícitas sobre datos reales de un grupo,
// nada de IA de caja negra — es justo lo que tiene que aprobar un gestor con un clic.
import type { GroupSibling } from "./recommend";
import { sane } from "./format";

export type PoolProposal = {
  id: string;
  fromId: string;
  fromName: string;
  fromCash: number;
  toId: string;
  toName: string;
  toScore: number;
  amount: number;
  rate: number; // tipo interno anual, según el score de quien recibe
  urgency: "alta" | "media" | "baja";
};

/** Tipo interno: interpola entre 2% (score 90+) y 6% (score 40-) — igual que negociaría un banco, pero en vivo. */
export function rateForScore(score: number): number {
  const clamped = Math.max(40, Math.min(90, score));
  const t = (clamped - 40) / (90 - 40);
  return Math.round((6 - t * 4) * 10) / 10;
}

export function buildProposals(siblings: GroupSibling[], maxProposals = 4): PoolProposal[] {
  // sane(): un solo cash_position disparatado (outlier sintético sin filtrar) no debe romper esto
  const withCash = siblings
    .map((s) => ({ s, cash: sane(s.signals?.cash_position) }))
    .filter((x): x is { s: GroupSibling; cash: number } => x.cash != null);
  if (withCash.length < 2) return [];

  const sorted = [...withCash].sort((a, b) => b.cash - a.cash);
  const lenders = sorted.slice(0, Math.ceil(sorted.length / 2)); // mitad con más caja
  const borrowers = [...sorted].reverse().slice(0, Math.ceil(sorted.length / 2)); // mitad con menos

  const proposals: PoolProposal[] = [];
  let li = 0;
  for (const b of borrowers) {
    if (proposals.length >= maxProposals) break;
    if (b.s.score >= 75 && b.cash > 60_000) continue; // no necesita nada, fuera
    const lender = lenders[li % lenders.length];
    li++;
    if (lender.s.companyId === b.s.companyId) continue;
    if (lender.cash < 80_000) continue;
    const need = Math.max(20_000, 60_000 - b.cash);
    const amount = Math.round(Math.min(need, lender.cash * 0.35) / 1000) * 1000;
    if (amount < 5_000) continue;
    proposals.push({
      id: `${lender.s.companyId}-${b.s.companyId}`,
      fromId: lender.s.companyId,
      fromName: lender.s.displayName,
      fromCash: lender.cash,
      toId: b.s.companyId,
      toName: b.s.displayName,
      toScore: b.s.score,
      amount,
      rate: rateForScore(b.s.score),
      urgency: b.s.score < 45 ? "alta" : b.s.score < 60 ? "media" : "baja",
    });
  }
  return proposals.sort((a, b) => (a.urgency === b.urgency ? b.amount - a.amount : a.urgency === "alta" ? -1 : 1));
}
