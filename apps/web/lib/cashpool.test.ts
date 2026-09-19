import assert from "node:assert/strict";
import test from "node:test";
import { buildSeries, DEFAULT_SETTINGS, snapshot, summarize, type EntityBase, type MonthRow, type PoolSettings } from "./cashpool";

const base: EntityBase[] = [
  { companyId: "LENDER", currency: "EUR", country: "ES" },
  { companyId: "BORROWER", currency: "EUR", country: "ES" },
];
const row = (cashLocal: number | null, score = 75, delta3m: number | null = 0): MonthRow => ({
  month: "2026-08", score, cashLocal, delta1m: 0, delta3m, explanation: null, recentDrawdownEur: 0,
});
const plan = (borrower = row(-20_000), lender = row(300_000), settings: PoolSettings = DEFAULT_SETTINGS, entities = base, month = "2026-08") =>
  snapshot(month, entities, new Map([["LENDER", lender], ["BORROWER", borrower]]), settings);

test("only proposes transfers within the same currency", () => {
  const s = plan(row(-20_000), row(300_000), DEFAULT_SETTINGS, [base[0], { ...base[1], currency: "GBP" }]);
  assert.equal(s.proposals.length, 0);
  assert.ok(s.entities[1].needEur > 0);
});

test("liquidity need is independent of a high score", () => {
  const s = plan(row(10_000, 95));
  assert.equal(s.entities[1].needEur, 15_000);
  assert.ok(s.proposals.length > 0);
});

test("the same score gives different support for improvement, a dip and deterioration", () => {
  const improving = plan(row(-20_000, 65, 8));
  const dip = plan({ ...row(-20_000, 65, -2), delta1m: -9 });
  const falling = plan(row(-20_000, 65, -8));
  assert.ok(improving.proposals[0].amountEur > dip.proposals[0].amountEur);
  assert.equal(falling.proposals.length, 0);
  assert.equal(falling.entities[1].policy, "review");
});

test("a deteriorating donor cannot lend even with a high current score", () => {
  assert.equal(plan(row(-20_000), row(300_000, 85, -8)).proposals.length, 0);
});

test("missing cash, history and outliers are not silently treated as healthy", () => {
  for (const cash of [null, NaN, Infinity, 9_000_000]) {
    const s = plan(row(cash));
    assert.equal(s.entities[1].role, "unknown");
    assert.equal(s.proposals.length, 0);
  }
  assert.equal(plan(row(-20_000, 75, null)).entities[1].policy, "review");
  const missing = snapshot("2026-08", base, new Map([["LENDER", row(300_000)]]), DEFAULT_SETTINGS);
  assert.equal(missing.entities.length, 2);
  assert.equal(missing.entities[1].role, "unknown");
});

test("invalid scores and unsupported currencies cannot generate proposals", () => {
  assert.equal(plan(row(-20_000, NaN)).proposals.length, 0);
  assert.equal(plan(row(-20_000, 101)).proposals.length, 0);
  const entities = base.map((b) => ({ ...b, currency: "UNKNOWN" }));
  assert.equal(plan(row(-20_000), row(300_000), DEFAULT_SETTINGS, entities).proposals.length, 0);
});

test("amounts and fees never exceed the donor budget or borrower limit", () => {
  const entities = [...base, { ...base[1], companyId: "BORROWER2" }];
  const rows = new Map([["LENDER", row(153_333)], ["BORROWER", row(-10_555)], ["BORROWER2", row(-40_777)]]);
  const s = snapshot("2026-08", entities, rows, DEFAULT_SETTINGS);
  const donor = s.entities[0];
  const debit = s.proposals.reduce((n, p) => n + p.amountEur + p.feeEur, 0);
  assert.ok(debit <= donor.spareEur);
  assert.ok(donor.cashEur! - debit >= donor.reserveEur);
  for (const b of s.entities.slice(1)) {
    const credit = s.proposals.filter((p) => p.toId === b.companyId).reduce((n, p) => n + p.amountEur, 0);
    assert.ok(credit <= b.receiveLimitEur);
    assert.ok(credit <= b.needEur);
  }
});

test("net group saving uses the operation term, opportunity cost and transfer fee", () => {
  const settings = { ...DEFAULT_SETTINGS, days: 30, bankRate: 6, depositRate: 2, transferFeeEur: 12 };
  const p = plan(row(-20_000), row(300_000), settings).proposals[0];
  assert.equal(p.bankInterestEur, p.amountEur * 0.06 * 30 / 365);
  assert.equal(p.opportunityCostEur, p.amountEur * 0.02 * 30 / 365);
  assert.equal(p.netSavingEur, p.bankInterestEur - p.opportunityCostEur - 12);
});

test("unprofitable transfers are not recommended", () => {
  assert.equal(plan(row(-20_000), row(300_000), { ...DEFAULT_SETTINGS, bankRate: 1, depositRate: 2 }).proposals.length, 0);
  assert.equal(plan(row(-20_000), row(300_000), { ...DEFAULT_SETTINGS, transferFeeEur: 10_000 }).proposals.length, 0);
});

test("proposal identity changes with month, assumptions and evidence", () => {
  const initial = plan().proposals[0].id;
  assert.notEqual(initial, plan(row(-20_000), row(300_000), DEFAULT_SETTINGS, base, "2026-07").proposals[0].id);
  assert.notEqual(initial, plan(row(-20_000), row(300_000), { ...DEFAULT_SETTINGS, days: 60 }).proposals[0].id);
  assert.notEqual(initial, plan(row(-20_000, 80)).proposals[0].id);
});

test("rejected proposals are excluded from the remaining scenario; approval is separate", () => {
  const s = plan();
  const p = s.proposals[0];
  assert.equal(summarize(s, {}).approvedEur, 0);
  assert.equal(summarize(s, {}).pending, 1);
  assert.equal(summarize(s, { [p.id]: "approved" }).approvedEur, p.amountEur);
  const rejected = summarize(s, { [p.id]: "rejected" });
  assert.equal(rejected.proposedEur, 0);
  assert.equal(rejected.netSavingEur, 0);
  assert.equal(rejected.uncoveredEur, s.entities[1].needEur);
});

test("calendar gaps do not turn previous rows into three-month history", () => {
  const rows = [
    { companyId: "BORROWER", month: "2026-01", score: 40, cashLocal: -1000, explanation: null },
    { companyId: "BORROWER", month: "2026-02", score: 50, cashLocal: -1000, explanation: null },
    { companyId: "BORROWER", month: "2026-07", score: 60, cashLocal: -1000, explanation: null },
    { companyId: "BORROWER", month: "2026-08", score: 70, cashLocal: -1000, explanation: null },
  ];
  const series = buildSeries(base, rows, DEFAULT_SETTINGS);
  assert.equal(series.at(-1)!.entities[1].delta3m, null);
  assert.equal(series.at(-1)!.entities[1].trend, "unknown");
});

test("historical reserve uses only observed cash changes available at that month", () => {
  const rows = [
    { companyId: "LENDER", month: "2026-04", score: 80, cashLocal: 350_000, explanation: null },
    { companyId: "LENDER", month: "2026-05", score: 80, cashLocal: 250_000, explanation: null },
    { companyId: "LENDER", month: "2026-06", score: 80, cashLocal: 260_000, explanation: null },
    { companyId: "LENDER", month: "2026-07", score: 80, cashLocal: 270_000, explanation: null },
  ];
  const before = buildSeries(base, rows, DEFAULT_SETTINGS);
  const after = buildSeries(base, [...rows, { ...rows[0], month: "2026-08", cashLocal: -2_000_000 }], DEFAULT_SETTINGS);
  assert.equal(before.at(-1)!.entities[0].reserveEur, 100_000);
  assert.deepEqual(before, after.slice(0, before.length));
});

test("non-EUR transfers preserve the same native amount on both sides", () => {
  const entities = base.map((b) => ({ ...b, currency: "GBP" }));
  const p = plan(row(-20_000), row(300_000), DEFAULT_SETTINGS, entities).proposals[0];
  assert.equal(p.currency, "GBP");
  assert.equal(p.amountLocal, Math.floor(p.amountLocal));
  assert.ok(p.amountEur > p.amountLocal);
});

test("invalid scenario settings are rejected", () => {
  for (const settings of [
    { ...DEFAULT_SETTINGS, days: 0 },
    { ...DEFAULT_SETTINGS, bankRate: NaN },
    { ...DEFAULT_SETTINGS, reserveEur: -1 },
    { ...DEFAULT_SETTINGS, transferFeeEur: -1 },
  ]) assert.throws(() => plan(row(-20_000), row(300_000), settings));
});
