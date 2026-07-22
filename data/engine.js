/* ============================================================================
   inhand — the salary engine. Pure functions only. All money is INTEGER PAISE.
   Constants are read FROM data/corpus.js; nothing is duplicated here.
   Shared by app.js (browser global `INHAND_ENGINE`) and the Node tests.
   AY 2026-27 (FY 2025-26). This is an estimate, not a payslip. Not tax advice.
   ============================================================================ */

(function (root, factory) {
  const CORPUS = (typeof module !== "undefined" && module.exports)
    ? require("./corpus.js")
    : root.INHAND;
  const api = factory(CORPUS);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.INHAND_ENGINE = api;
})(typeof self !== "undefined" ? self : this, function (CORPUS) {
  "use strict";

  // ---- constant lookup (single source of truth) --------------------------
  const C = {};
  for (const c of CORPUS.CONSTANTS) C[c.id] = c.value;

  const SLAB = {};
  for (const s of CORPUS.SLABS) SLAB[s.regime] = s.slabs;

  const round = (x) => Math.round(x); // paise are already integers; guards float ops

  // ---- slab tax (input & output in paise) --------------------------------
  function slabTax(taxablePaise, slabs) {
    let tax = 0;
    for (const s of slabs) {
      const hi = s.max === null ? Infinity : s.max;
      if (taxablePaise > s.min) {
        tax += (Math.min(taxablePaise, hi) - s.min) * s.rate;
      }
    }
    return round(tax);
  }

  // ---- income tax before surcharge & cess, incl. 87A rebate + marginal relief
  function taxBeforeSurcharge(taxable, regime) {
    const slabs = SLAB[regime];
    let tax = slabTax(taxable, slabs);
    if (regime === "new") {
      if (taxable <= C.rebate_87a_new_limit) {
        tax -= Math.min(tax, C.rebate_87a_new_amount);
        if (tax < 0) tax = 0;
      } else {
        // 87A marginal relief: tax cannot exceed income beyond the ₹12L limit
        const excess = taxable - C.rebate_87a_new_limit;
        if (tax > excess) tax = excess;
      }
    } else {
      if (taxable <= C.rebate_87a_old_limit) {
        tax -= Math.min(tax, C.rebate_87a_old_amount);
        if (tax < 0) tax = 0;
      }
    }
    return round(tax);
  }

  // ---- surcharge with marginal relief at each threshold ------------------
  function surcharge(taxable, baseTax, regime) {
    const tiers = CORPUS.SURCHARGE.tiers;
    let rate = 0, thr = 0;
    for (const t of tiers) { if (taxable > t.over) { rate = t.rate; thr = t.over; } }
    if (rate === 0) return 0;
    let sur = baseTax * rate;
    // marginal relief: (baseTax + surcharge) - taxAtThreshold ≤ (taxable - thr)
    const taxAtThr = taxBeforeSurcharge(thr, regime); // no surcharge exactly at threshold
    const cap = taxAtThr + (taxable - thr);
    if (baseTax + sur > cap) sur = cap - baseTax;
    return round(Math.max(0, sur));
  }

  // ---- full annual tax (paise) -------------------------------------------
  function annualTax(taxable, regime) {
    const base = taxBeforeSurcharge(taxable, regime);
    const sur = surcharge(taxable, base, regime);
    const cess = round((base + sur) * C.cess_rate);
    return { base, surcharge: sur, cess, total: base + sur + cess };
  }

  // ---- HRA exemption (old regime), Rule 2A -------------------------------
  // all args annual paise; metro=boolean
  function hraExemption({ basicAnnual, hraAnnual, rentAnnual, metro }) {
    const cap1 = hraAnnual;
    const cap2 = Math.max(0, rentAnnual - round(C.hra_rent_basic_rate * basicAnnual));
    const cap3 = round((metro ? C.hra_metro_rate : C.hra_nonmetro_rate) * basicAnnual);
    return Math.min(cap1, cap2, cap3);
  }

  // ---- EPF / EPS split (monthly, paise) ----------------------------------
  function pfSplit(basicMonthly) {
    const employee = round(C.epf_employee_rate * basicMonthly);
    const employer12 = round(C.epf_employer_rate * basicMonthly);
    const pensionableWage = Math.min(basicMonthly, C.eps_wage_ceiling);
    // EPS is statutorily rounded to the whole rupee (₹1,250 at ceiling, ₹833 at ₹10k basic)
    const eps = Math.round(C.eps_rate * pensionableWage / 100) * 100;
    const employerEpf = employer12 - eps;
    return { employee, employer12, eps, employerEpf };
  }

  // ---- gratuity monthly accrual (paise) ----------------------------------
  function gratuityMonthly(basicMonthly) {
    return round((C.gratuity_factor * basicMonthly * 12) / 12);
  }

  // ---- professional tax (annual paise) for a corpus state ----------------
  // basicPlusMonthly = the salary figure PT is assessed on (usually gross monthly).
  function ptAnnualForState(state, monthlyWage, annualWage, isWoman) {
    if (!state || !state.slabs) return null; // unverified → caller uses override
    if (state.exemption && isWoman && /women/i.test(state.exemption)) {
      // Maharashtra women ≤ ₹25,000 exempt
      if (monthlyWage <= 2500000) return 0;
    }
    if (state.annual_basis) {
      const band = state.slabs.find(s => annualWage > s.min && (s.max === null || annualWage <= s.max))
        || state.slabs[0];
      return band.pt_monthly * 11 + band.twelfth;
    }
    const band = state.slabs.find(s => monthlyWage > s.min && (s.max === null || monthlyWage <= s.max))
      || state.slabs[0];
    if (band.pt_monthly === 0) return 0;
    const feb = state.feb_amount != null ? state.feb_amount : band.pt_monthly;
    return band.pt_monthly * 11 + feb;
  }

  // worst-case annual PT across every slab row (for the Art. 276 property test)
  function ptWorstCaseAnnual(state) {
    if (!state || !state.slabs) return 0;
    let worst = 0;
    for (const band of state.slabs) {
      let annual;
      if (state.annual_basis) {
        annual = band.pt_monthly * 11 + band.twelfth;
      } else {
        const feb = state.feb_amount != null ? state.feb_amount : band.pt_monthly;
        annual = band.pt_monthly === 0 ? 0 : band.pt_monthly * 11 + feb;
      }
      if (annual > worst) worst = annual;
    }
    return worst;
  }

  // ---- component derivation from CTC -------------------------------------
  // Defaults: Basic 40% of CTC, HRA 50% of Basic, special allowance balances.
  // All inputs/outputs annual paise. Overrides supplied by the caller.
  function deriveComponents(ctcAnnual, overrides = {}) {
    const basic = overrides.basic != null ? overrides.basic : round(0.40 * ctcAnnual);
    const hra = overrides.hra != null ? overrides.hra : round(0.50 * basic);
    // employer PF (annual) is a CTC cost: employer 12% of basic (monthly split × 12)
    const basicMonthly = round(basic / 12);
    const pf = pfSplit(basicMonthly);
    const employerPfAnnual = pf.employer12 * 12;
    const gratuityAnnual = gratuityMonthly(basicMonthly) * 12;
    const otherFixed = overrides.other || 0; // any explicitly-entered fixed allowances
    // special allowance balances CTC = basic + hra + special + employerPF + gratuity + other
    const special = overrides.special != null
      ? overrides.special
      : ctcAnnual - basic - hra - employerPfAnnual - gratuityAnnual - otherFixed;
    const sum = basic + hra + special + employerPfAnnual + gratuityAnnual + otherFixed;
    return {
      basic, hra, special, otherFixed,
      employerPfAnnual, gratuityAnnual,
      reconciles: sum === ctcAnnual,
      reconileDelta: sum - ctcAnnual,
    };
  }

  return {
    C, round, slabTax, taxBeforeSurcharge, surcharge, annualTax,
    hraExemption, pfSplit, gratuityMonthly,
    ptAnnualForState, ptWorstCaseAnnual, deriveComponents,
    STD_DED: { new: C.std_deduction_new, old: C.std_deduction_old },
  };
});
