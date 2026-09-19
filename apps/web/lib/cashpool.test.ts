import assert from "node:assert/strict";
import test from "node:test";
import { buildSeries, DEFAULT_SETTINGS, groupHealth, poolEconomics, snapshot, summarize, type EntityBase, type MonthRow, type PoolSettings } from "./cashpool";
import { poolingOverview, groupSeries, type PoolingStore } from "./products/pooling";

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

test("group health weights subsidiaries equally and exposes weak subsidiaries", () => {
  const health = groupHealth(plan(row(null, 20, -10), row(4_000_000, 90, 8)));
  assert.equal(health.score, 55);
  assert.equal(health.scored, 2);
  assert.equal(health.low, 1);
  assert.equal(health.deteriorating, 1);
});

test("group health excludes invalid scores but includes zero and exposes partial coverage", () => {
  for (const invalid of [NaN, Infinity, -1, 101]) {
    const health = groupHealth(plan(row(0, invalid), row(100_000, 0)));
    assert.equal(health.score, 0);
    assert.equal(health.scored, 1);
    assert.equal(health.total, 2);
    assert.equal(health.low, 1);
  }
  assert.equal(groupHealth(snapshot("2026-08", base, new Map())).score, null);
  assert.equal(groupHealth(snapshot("2026-08", [], new Map())).total, 0);
});

test("group health never counts missing history as a stable observation", () => {
  const health = groupHealth(plan(row(0, 40, null), row(100_000, 70, 0)));
  assert.equal(health.low, 0);
  assert.equal(health.comparable, 1);
  assert.equal(health.deteriorating, 0);
});

test("group health is independent of scenario assumptions and cash changes", () => {
  const initial = groupHealth(plan());
  assert.deepEqual(groupHealth(plan(row(500_000), row(null), { ...DEFAULT_SETTINGS, days: 90, reserveEur: 200_000 })), initial);
});

test("economic summary shows actual proposed amounts and net savings, not hypothetical matching", () => {
  const s = plan();
  const economics = poolEconomics([s]);
  const summary = summarize(s, {});
  assert.equal(economics.needEur, 45_000);
  assert.equal(economics.movableEur, 137_500);
  assert.equal(economics.proposedEur, summary.proposedEur);
  assert.equal(economics.netSavingEur, summary.netSavingEur);
  assert.equal(economics.netSavingEur, economics.bankInterestEur - economics.opportunityCostEur - economics.feeEur);
  const rejected = poolEconomics([s], { [s.proposals[0].id]: "rejected" });
  assert.equal(rejected.netSavingEur, 0);
  assert.equal(rejected.proposedEur, 0);
  assert.equal(rejected.uncoveredEur, economics.needEur);
  assert.equal(rejected.needEur, economics.needEur);
  assert.deepEqual(poolEconomics([s], { [s.proposals[0].id]: "approved" }), economics);
});

test("aggregate opportunity never matches supply and demand across business groups", () => {
  const surplusOnly = snapshot("2026-08", [base[0]], new Map([["LENDER", row(300_000)]]));
  const needOnly = snapshot("2026-08", [base[1]], new Map([["BORROWER", row(-20_000)]]));
  const economics = poolEconomics([surplusOnly, needOnly]);
  assert.ok(economics.movableEur > economics.needEur);
  assert.equal(economics.proposedEur, 0);
  assert.equal(economics.netSavingEur, 0);
  assert.equal(economics.uncoveredEur, economics.needEur);
});

test("economic aggregates preserve missing-data coverage and add only compatible plans", () => {
  const s = plan();
  const missing = snapshot("2026-08", base, new Map());
  const economics = poolEconomics([s, missing]);
  assert.equal(economics.totalEntities, 4);
  assert.equal(economics.cashKnown, 2);
  assert.equal(economics.proposedEur, summarize(s, {}).proposedEur);
  assert.equal(poolEconomics([]).cashKnown, 0);
});

const poolingStore = (count = 2): PoolingStore => {
  const store: PoolingStore = { groups: new Map(), byId: new Map(), months: ["2026-05", "2026-08"], cash: new Map() };
  for (let i = 0; i < count; i++) {
    const ids = [`LENDER_${i}`, `BORROWER_${i}`];
    store.groups.set(`GROUP_${i}`, ids);
    for (const id of ids) {
      store.byId.set(id, { id, currency: "EUR", country: "ES", scores: [75, 75] });
      for (const month of store.months) store.cash.set(`${id}|${month}`, id.startsWith("LENDER") ? 300_000 : -20_000);
    }
  }
  return store;
};

test("group overview includes all multi-company groups, not only the old selector's first forty", () => {
  const store = poolingStore(45);
  const overview = poolingOverview(store, "2026-08");
  assert.equal(overview.groups.length, 45);
  assert.equal(overview.groups.filter((g) => g.economics.proposedEur > 0).length, 45);
  assert.equal(overview.totals.proposedEur, overview.groups.reduce((sum, group) => sum + group.economics.proposedEur, 0));
  assert.ok(overview.groups.every((group) => group.month === "2026-08"));
});

test("group overview uses a common selected month and never substitutes a group's latest data", () => {
  const store = poolingStore();
  const older = poolingOverview(store, "2026-05");
  store.byId.get("LENDER_0")!.scores[1] = 10;
  store.cash.set("LENDER_0|2026-08", 0);
  assert.deepEqual(poolingOverview(store, "2026-05"), older);
  assert.throws(() => poolingOverview(store, "2026-07"));
});

test("cash without a valid score is visible as need, but cannot generate a loan", () => {
  const store = poolingStore(1);
  store.byId.get("BORROWER_0")!.scores = [null, null];
  const data = groupSeries(store, "GROUP_0");
  assert.equal(data.rows.find((r) => r.companyId === "BORROWER_0" && r.month === "2026-08")?.score, null);
  const overview = poolingOverview(store, "2026-08");
  assert.equal(overview.totals.cashKnown, 2);
  assert.equal(overview.totals.needEur, 45_000);
  assert.equal(overview.totals.proposedEur, 0);
  assert.equal(overview.groups[0].scored, 1);
});
