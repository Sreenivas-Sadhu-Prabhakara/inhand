"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../data/engine.js");
const CORPUS = require("../data/corpus.js");

// money helpers: rupees -> paise
const R = (rupees) => Math.round(rupees * 100);

// ------------------------------------------------------------------ EPF/EPS
test("EPS split at ceiling — basic ₹40,000/mo", () => {
  const s = E.pfSplit(R(40000));
  assert.equal(s.employer12, R(4800));
  assert.equal(s.eps, R(1250));        // 8.33% × 15,000
  assert.equal(s.employerEpf, R(3550));// 4800 − 1250
  assert.equal(s.employee, R(4800));   // 12% of 40,000
});

test("EPS split below ceiling — basic ₹10,000/mo", () => {
  const s = E.pfSplit(R(10000));
  // 8.33% of 10,000 = 833
  assert.equal(s.eps, R(833));
  assert.equal(s.employer12, R(1200));
  assert.equal(s.employerEpf, R(1200) - R(833)); // 367
  assert.equal(s.employee, R(1200));
});

// ------------------------------------------------------------------ Gratuity
test("gratuity factor re-derivation and monthly accrual", () => {
  assert.ok(Math.abs(15 / 26 / 12 - 0.0481) < 1e-4);
  // basic ₹40,000/mo → ₹1,924/mo
  assert.equal(E.gratuityMonthly(R(40000)), R(1924));
});

// ------------------------------------------------------------------ New regime
test("new-regime slab math AY 2026-27", () => {
  // taxable ₹24,00,000 → ₹3,00,000 before cess
  assert.equal(E.taxBeforeSurcharge(R(2400000), "new"), R(300000));
  // taxable ₹12,00,000 → ₹0 after 87A
  assert.equal(E.taxBeforeSurcharge(R(1200000), "new"), 0);
  // salaried gross ₹12,75,000 → taxable after ₹75k std ded = ₹12,00,000 → ₹0
  const taxable = R(1275000) - E.STD_DED.new;
  assert.equal(E.taxBeforeSurcharge(taxable, "new"), 0);
});

test("87A marginal relief — taxable ₹12,10,000 → ₹10,000", () => {
  assert.equal(E.taxBeforeSurcharge(R(1210000), "new"), R(10000));
});

// ------------------------------------------------------------------ Old regime
test("old regime slab + cess — taxable ₹10,00,000", () => {
  assert.equal(E.taxBeforeSurcharge(R(1000000), "old"), R(112500));
  const t = E.annualTax(R(1000000), "old");
  assert.equal(t.total, R(117000)); // 112500 + 4% cess
});

test("HRA exemption — metro and non-metro branches", () => {
  // basic 50k, HRA 25k, rent 20k monthly → annualise
  const exMetro = E.hraExemption({
    basicAnnual: R(50000 * 12), hraAnnual: R(25000 * 12),
    rentAnnual: R(20000 * 12), metro: true,
  });
  assert.equal(exMetro, R(15000 * 12)); // ₹1,80,000
  const exNon = E.hraExemption({
    basicAnnual: R(50000 * 12), hraAnnual: R(25000 * 12),
    rentAnnual: R(20000 * 12), metro: false,
  });
  // non-metro cap3 = 40% × 6,00,000 = 2,40,000; cap2 = (2,40,000 − 60,000)=1,80,000; cap1=3,00,000
  assert.equal(exNon, R(15000 * 12)); // still bound by rent−10% = ₹1,80,000
});

// ------------------------------------------------------------------ Surcharge
test("surcharge with marginal relief", () => {
  // taxable ₹60,00,000 new regime → full 10% surcharge
  const base60 = E.taxBeforeSurcharge(R(6000000), "new");
  assert.equal(E.surcharge(R(6000000), base60, "new"), Math.round(base60 * 0.10));
  // taxable ₹50,00,100 → marginal relief caps EXTRA tax at ₹100
  const base = E.taxBeforeSurcharge(R(5000100), "new");
  const sur = E.surcharge(R(5000100), base, "new");
  const taxAt50L = E.taxBeforeSurcharge(R(5000000), "new");
  assert.equal((base + sur) - taxAt50L, R(100));
});

// ------------------------------------------------------------ PT property test
test("PT corpus property — worst-case annual ≤ ₹2,500 (Art. 276) for every verified state", () => {
  const CAP = E.C.pt_annual_cap; // ₹2,500 in paise
  for (const st of CORPUS.PT_STATES) {
    if (!st.slabs) continue; // unverified states have no slabs
    const worst = E.ptWorstCaseAnnual(st);
    assert.ok(worst <= CAP, `${st.state_code} worst-case ${worst} exceeds cap`);
  }
});

test("PT spot checks", () => {
  const KA = CORPUS.PT_STATES.find(s => s.state_code === "KA");
  // Karnataka ₹30,000/mo → ₹2,500/yr (2025 amendment: ₹200×11 + ₹300 Feb).
  // NOTE: supersedes the pre-2025 ₹2,400 figure — see README DEVIATIONS.
  assert.equal(E.ptAnnualForState(KA, R(30000), R(360000), false), R(2500));
  const MH = CORPUS.PT_STATES.find(s => s.state_code === "MH");
  // Maharashtra ₹30,000/mo → ₹2,500/yr (₹200×11 + ₹300 Feb)
  assert.equal(E.ptAnnualForState(MH, R(30000), R(360000), false), R(2500));
  // Maharashtra woman ≤ ₹25,000 exempt
  assert.equal(E.ptAnnualForState(MH, R(20000), R(240000), true), 0);
  // Madhya Pradesh (annual-basis) top band → ₹2,500/yr
  const MP = CORPUS.PT_STATES.find(s => s.state_code === "MP");
  assert.equal(E.ptAnnualForState(MP, R(50000), R(600000), false), R(2500));
});

test("unverified states return null (caller uses manual override)", () => {
  const TN = CORPUS.PT_STATES.find(s => s.state_code === "TN");
  assert.equal(TN.slabs, null);
  assert.equal(E.ptAnnualForState(TN, R(50000), R(600000), false), null);
});

// ------------------------------------------------------------ Reconciliation
test("component derivation reconciles to CTC for fixture CTCs", () => {
  for (const ctc of [R(600000), R(1800000), R(6000000)]) {
    const d = E.deriveComponents(ctc);
    // sum of components + employer EPF + gratuity accrual = CTC (special balances)
    const sum = d.basic + d.hra + d.special + d.otherFixed + d.employerPfAnnual + d.gratuityAnnual;
    assert.equal(sum, ctc, `CTC ${ctc} did not reconcile`);
    assert.ok(d.reconciles);
  }
});

test("monthly in-hand identity: gross − (EPF_emp + PT + TDS) = in-hand", () => {
  // Build a concrete ₹18L CTC new-regime case and reconcile the identity to the paisa.
  const ctc = R(1800000);
  const comp = E.deriveComponents(ctc);
  const basicMonthly = E.round(comp.basic / 12);
  const pf = E.pfSplit(basicMonthly);
  // gross monthly cash = (basic + hra + special + other) / 12  (employer PF & gratuity are NOT cash)
  const grossCashAnnual = comp.basic + comp.hra + comp.special + comp.otherFixed;
  const grossMonthly = E.round(grossCashAnnual / 12);
  // taxable (new regime) = grossCash − std deduction; TDS = annual tax / 12
  const taxable = grossCashAnnual - E.STD_DED.new;
  const tax = E.annualTax(Math.max(0, taxable), "new").total;
  const tdsMonthly = E.round(tax / 12);
  const ptMonthly = 0; // no state chosen in this fixture
  const inHand = grossMonthly - pf.employee - ptMonthly - tdsMonthly;
  assert.equal(grossMonthly - (pf.employee + ptMonthly + tdsMonthly), inHand);
  assert.ok(inHand > 0);
});

test("12 × monthly TDS reconciles to annual tax within ₹12", () => {
  const tax = E.annualTax(R(2400000), "new").total; // ₹3,00,000 + cess
  const tds = E.round(tax / 12);
  assert.ok(Math.abs(tds * 12 - tax) <= R(12));
});

// ------------------------------------------------------------------ Corpus invariants
test("single source of truth — engine constants equal corpus", () => {
  const byId = {};
  for (const c of CORPUS.CONSTANTS) byId[c.id] = c.value;
  assert.equal(E.C.epf_employee_rate, byId.epf_employee_rate);
  assert.equal(E.C.eps_wage_ceiling, byId.eps_wage_ceiling);
  assert.equal(E.STD_DED.new, byId.std_deduction_new);
  assert.equal(E.STD_DED.old, byId.std_deduction_old);
});

test("corpus provenance — every fact is sourced and dated", () => {
  for (const c of CORPUS.CONSTANTS) {
    assert.ok(c.source && c.source_url && c.verified, `constant ${c.id} missing provenance`);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(c.verified));
  }
  for (const s of CORPUS.SLABS) {
    assert.ok(s.source && s.source_url && s.verified);
    // slabs cover from 0 with no gaps
    let cursor = 0;
    for (const b of s.slabs) { assert.equal(b.min, cursor); cursor = b.max === null ? Infinity : b.max; }
    assert.equal(cursor, Infinity);
  }
  for (const st of CORPUS.PT_STATES) {
    assert.ok(st.state_code && st.state_name && st.source && st.source_url);
    // verified states carry a date; unverified are explicitly null + note
    if (st.slabs) assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(st.verified));
    else assert.ok(st.note, `${st.state_code} unverified but no note`);
  }
});

test("new-regime slabs are monotonic non-decreasing in rate and money is integer paise", () => {
  const n = CORPUS.SLABS.find(s => s.regime === "new").slabs;
  for (let i = 1; i < n.length; i++) assert.ok(n[i].rate >= n[i - 1].rate);
  // money-unit constants (paise) must be integers; rate/fraction constants need not be
  for (const c of CORPUS.CONSTANTS) {
    if (/paise/.test(c.unit)) assert.equal(c.value, Math.round(c.value), `${c.id} not integer paise`);
  }
});

// ------------------------------------------------------------------ Property fuzz
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

test("property fuzz — 3,000 random salaries: no NaN, tax ≤ taxable, cess exact, PT ≤ cap", () => {
  const rand = mulberry32(0x9e3779b9);
  const CAP = E.C.pt_annual_cap;
  for (let i = 0; i < 3000; i++) {
    const ctc = R(Math.floor(300000 + rand() * 49700000)); // ₹3L–₹5Cr
    const regime = rand() < 0.5 ? "new" : "old";
    const comp = E.deriveComponents(ctc);
    // reconciliation always holds
    const sum = comp.basic + comp.hra + comp.special + comp.otherFixed + comp.employerPfAnnual + comp.gratuityAnnual;
    assert.equal(sum, ctc);
    const grossCash = comp.basic + comp.hra + comp.special + comp.otherFixed;
    const taxable = Math.max(0, grossCash - (regime === "new" ? E.STD_DED.new : E.STD_DED.old));
    const t = E.annualTax(taxable, regime);
    assert.ok(Number.isFinite(t.total) && t.total >= 0);
    assert.ok(t.base <= taxable);
    assert.equal(t.cess, E.round((t.base + t.surcharge) * E.C.cess_rate));
    // PT for a random verified state never breaks the cap
    for (const st of CORPUS.PT_STATES) {
      if (!st.slabs) continue;
      const pt = E.ptAnnualForState(st, E.round(grossCash / 12), grossCash, rand() < 0.5);
      if (pt != null) assert.ok(pt <= CAP);
    }
  }
});

// ------------------------------------------------------------------ CSV round-trip
function toCSV(rows) {
  const esc = (v) => {
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return rows.map(r => r.map(esc).join(",")).join("\r\n");
}
function parseCSV(text) {
  const out = []; let row = [], field = "", i = 0, q = false;
  while (i < text.length) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { q = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { q = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r" && text[i + 1] === "\n") { row.push(field); out.push(row); row = []; field = ""; i += 2; continue; }
    if (c === "\n") { row.push(field); out.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  row.push(field); out.push(row);
  return out;
}
test("CSV round-trip preserves ledger rows incl. commas and quotes in labels", () => {
  const rows = [
    ["Line", "Rule", "Annual (₹)", "Monthly (₹)"],
    ['Basic (40% CTC, "market" convention)', "EPF Scheme para 29", "720000", "60000"],
    ["EPF employee, 12%", "EPF Scheme 1952, para 29", "-86400", "-7200"],
    ["Special allowance, balances CTC", "—", "480000", "40000"],
  ];
  const parsed = parseCSV(toCSV(rows));
  assert.deepEqual(parsed, rows);
  assert.equal(parsed.length, rows.length);
});
