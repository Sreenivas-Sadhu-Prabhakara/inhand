/* ============================================================================
   inhand — statutory corpus (AY 2026-27 / FY 2025-26)
   Single source of truth. app.js and test/*.test.js both read constants FROM
   here — no number is duplicated in the engine. Every fact carries provenance.
   Verified 2026-07-22. See sources/CITATIONS.md.
   Works in the browser (global `INHAND`) and in Node (`module.exports`).
   ============================================================================ */

const AY = "AY 2026-27 (FY 2025-26)";
const VERIFIED_ON = "2026-07-22";

/* ---- (1) STATUTORY CONSTANTS -------------------------------------------- */
const CONSTANTS = [
  { id: "epf_employee_rate", label: "EPF employee contribution", value: 0.12, unit: "fraction",
    applies_to: "basic + DA",
    source: "EPF Scheme 1952, para 29", source_url: "https://www.epfindia.gov.in/site_docs/PDFs/MiscPDFs/ContributionRate.pdf",
    effective: "in force", verified: VERIFIED_ON },
  { id: "epf_employer_rate", label: "EPF+EPS employer contribution", value: 0.12, unit: "fraction",
    applies_to: "basic + DA",
    source: "EPF Scheme 1952, para 29", source_url: "https://www.epfindia.gov.in/site_docs/PDFs/MiscPDFs/ContributionRate.pdf",
    effective: "in force", verified: VERIFIED_ON },
  { id: "eps_rate", label: "EPS (pension) share of employer contribution", value: 1250 / 15000, unit: "fraction (8.33%, exactly 1250/15000)",
    applies_to: "pensionable wage (capped)",
    source: "Employees' Pension Scheme 1995", source_url: "https://www.pensionbazaar.com/epf/employer-epf-contribution/",
    effective: "in force", verified: VERIFIED_ON,
    note: "Published as 8.33%; the exact statutory figure at the ₹15,000 ceiling is ₹1,250/mo (1250/15000)." },
  { id: "eps_wage_ceiling", label: "EPS pensionable-wage ceiling", value: 1500000, unit: "paise/month",
    applies_to: "EPS computation (₹15,000/mo)",
    source: "GSR 609(E)", source_url: "https://www.pensionbazaar.com/epf/employer-epf-contribution/",
    effective: "2014-09-01", verified: VERIFIED_ON },
  { id: "gratuity_factor", label: "Gratuity accrual factor (15/26 per year)", value: 0.0481, unit: "fraction of basic per year",
    applies_to: "basic (annual accrual, employer cost)",
    source: "Payment of Gratuity Act 1972, s.4(2)", source_url: "https://labour.gov.in/",
    effective: "in force", verified: VERIFIED_ON,
    note: "15 days' wages per completed year on a 26-day month. Normally payable only after 5 years of continuous service." },
  { id: "std_deduction_new", label: "Standard deduction (new regime)", value: 7500000, unit: "paise/year",
    applies_to: "salaried, new regime (₹75,000)",
    source: "Finance Act 2025", source_url: "https://www.indianpaycalculator.in/income-tax-slabs",
    effective: "FY 2025-26", verified: VERIFIED_ON },
  { id: "std_deduction_old", label: "Standard deduction (old regime)", value: 5000000, unit: "paise/year",
    applies_to: "salaried, old regime (₹50,000)",
    source: "Income-tax Act 1961, s.16(ia)", source_url: "https://www.axismaxlife.com/blog/tax-savings/income-tax-slab-2025-26",
    effective: "FY 2025-26", verified: VERIFIED_ON },
  { id: "rebate_87a_new_amount", label: "Sec 87A rebate cap (new regime)", value: 6000000, unit: "paise (₹60,000)",
    applies_to: "resident individual, total income ≤ ₹12,00,000",
    source: "Income-tax Act 1961, s.87A (Finance Act 2025)", source_url: "https://tax2win.in/guide/section-87a",
    effective: "FY 2025-26", verified: VERIFIED_ON },
  { id: "rebate_87a_new_limit", label: "Sec 87A income limit (new regime)", value: 120000000, unit: "paise (₹12,00,000)",
    applies_to: "new regime rebate eligibility",
    source: "Income-tax Act 1961, s.87A (Finance Act 2025)", source_url: "https://tax2win.in/guide/section-87a",
    effective: "FY 2025-26", verified: VERIFIED_ON },
  { id: "rebate_87a_old_amount", label: "Sec 87A rebate cap (old regime)", value: 1250000, unit: "paise (₹12,500)",
    applies_to: "resident individual, total income ≤ ₹5,00,000",
    source: "Income-tax Act 1961, s.87A", source_url: "https://tax2win.in/guide/section-87a",
    effective: "FY 2025-26", verified: VERIFIED_ON },
  { id: "rebate_87a_old_limit", label: "Sec 87A income limit (old regime)", value: 50000000, unit: "paise (₹5,00,000)",
    applies_to: "old regime rebate eligibility",
    source: "Income-tax Act 1961, s.87A", source_url: "https://tax2win.in/guide/section-87a",
    effective: "FY 2025-26", verified: VERIFIED_ON },
  { id: "cess_rate", label: "Health & Education cess", value: 0.04, unit: "fraction",
    applies_to: "income tax + surcharge",
    source: "Finance Act 2025", source_url: "https://www.indianpaycalculator.in/income-tax-slabs",
    effective: "FY 2025-26", verified: VERIFIED_ON },
  { id: "sec80c_cap", label: "Section 80C deduction cap (old regime)", value: 15000000, unit: "paise (₹1,50,000)",
    applies_to: "old regime aggregate 80C",
    source: "Income-tax Act 1961, s.80C", source_url: "https://www.axismaxlife.com/blog/tax-savings/income-tax-slab-2025-26",
    effective: "FY 2025-26", verified: VERIFIED_ON },
  { id: "hra_metro_rate", label: "HRA exemption cap — metro", value: 0.50, unit: "fraction of basic",
    applies_to: "old regime HRA exemption (Rule 2A)",
    source: "Income-tax Act 1961, s.10(13A) / Rule 2A", source_url: "https://tax2win.in/guide/section-10-13a",
    effective: "FY 2025-26", verified: VERIFIED_ON },
  { id: "hra_nonmetro_rate", label: "HRA exemption cap — non-metro", value: 0.40, unit: "fraction of basic",
    applies_to: "old regime HRA exemption (Rule 2A)",
    source: "Income-tax Act 1961, s.10(13A) / Rule 2A", source_url: "https://tax2win.in/guide/section-10-13a",
    effective: "FY 2025-26", verified: VERIFIED_ON },
  { id: "hra_rent_basic_rate", label: "HRA exemption — rent minus 10% basic", value: 0.10, unit: "fraction of basic",
    applies_to: "old regime HRA exemption (Rule 2A)",
    source: "Income-tax Act 1961, s.10(13A) / Rule 2A", source_url: "https://tax2win.in/guide/section-10-13a",
    effective: "FY 2025-26", verified: VERIFIED_ON },
  { id: "pt_annual_cap", label: "Professional-tax annual cap", value: 250000, unit: "paise (₹2,500)",
    applies_to: "any State's total PT per year",
    source: "Constitution of India, Article 276(2)", source_url: "https://taxguru.in/corporate-law/state-wise-professional-tax-slab-rates-2024-2025.html",
    effective: "in force", verified: VERIFIED_ON },
];

/* ---- (2) TAX SLAB TABLES ------------------------------------------------
   Money in paise. Slab = { min, max (null = infinity), rate }.                 */
const SLABS = [
  { regime: "new", ay: AY,
    source: "Finance Act 2025, First Schedule", source_url: "https://www.indianpaycalculator.in/income-tax-slabs",
    verified: VERIFIED_ON,
    slabs: [
      { min: 0,          max: 40000000,  rate: 0.00 },
      { min: 40000000,   max: 80000000,  rate: 0.05 },
      { min: 80000000,   max: 120000000, rate: 0.10 },
      { min: 120000000,  max: 160000000, rate: 0.15 },
      { min: 160000000,  max: 200000000, rate: 0.20 },
      { min: 200000000,  max: 240000000, rate: 0.25 },
      { min: 240000000,  max: null,      rate: 0.30 },
    ] },
  { regime: "old", ay: AY,
    source: "Income-tax Act 1961 (individual < 60)", source_url: "https://www.axismaxlife.com/blog/tax-savings/income-tax-slab-2025-26",
    verified: VERIFIED_ON,
    slabs: [
      { min: 0,          max: 25000000,  rate: 0.00 },
      { min: 25000000,   max: 50000000,  rate: 0.05 },
      { min: 50000000,   max: 100000000, rate: 0.20 },
      { min: 100000000,  max: null,      rate: 0.30 },
    ] },
];

/* Surcharge tiers (rate applies to base tax); marginal relief handled in engine. */
const SURCHARGE = {
  ay: AY,
  source: "Finance Act 2025", source_url: "https://www.indianpaycalculator.in/income-tax-slabs",
  verified: VERIFIED_ON,
  tiers: [
    { over: 500000000,  rate: 0.10 },  // > ₹50L
    { over: 1000000000, rate: 0.15 },  // > ₹1Cr
    { over: 2000000000, rate: 0.25 },  // > ₹2Cr (new-regime cap)
  ],
};

/* ---- (3) PROFESSIONAL TAX (v0.1 verified set) --------------------------
   Monthly-basis states, slabs in paise. `feb_amount` overrides February.
   States not listed (or with slabs:null) use the manual PT override.        */
const PT_STATES = [
  { state_code: "MH", state_name: "Maharashtra", basis: "monthly",
    slabs: [
      { min: 0,        max: 750000,  pt_monthly: 0 },
      { min: 750000,   max: 1000000, pt_monthly: 17500 },
      { min: 1000000,  max: null,    pt_monthly: 20000 },
    ],
    feb_amount: 30000, // ₹300 in February for the top band
    exemption: "Women earning ≤ ₹25,000/mo are exempt.",
    source: "Maharashtra State Tax on Professions Act 1975",
    source_url: "https://saral.pro/blogs/professional-tax-slab-rates-in-different-states/",
    effective: "in force", verified: VERIFIED_ON },
  { state_code: "KA", state_name: "Karnataka", basis: "monthly",
    slabs: [
      { min: 0,        max: 2500000, pt_monthly: 0 },
      { min: 2500000,  max: null,    pt_monthly: 20000 },
    ],
    feb_amount: 30000, // ₹300 in February
    exemption: null,
    source: "Karnataka Tax on Professions Act — Amendment Act 2025 (Act 33 of 2025)",
    source_url: "https://blog.pcsmgmt.com/2025/04/karnataka-professional-tax-slab-revised-amendment-act-2025.html",
    effective: "2025-04-01", verified: VERIFIED_ON,
    note: "Amendment 2025: ₹200/mo + ₹300 in Feb = ₹2,500/yr (supersedes the older ₹200-flat / ₹2,400 slab)." },
  { state_code: "WB", state_name: "West Bengal", basis: "monthly",
    slabs: [
      { min: 0,        max: 1000000, pt_monthly: 0 },
      { min: 1000000,  max: 1500000, pt_monthly: 11000 },
      { min: 1500000,  max: 2500000, pt_monthly: 13000 },
      { min: 2500000,  max: 4000000, pt_monthly: 15000 },
      { min: 4000000,  max: null,    pt_monthly: 20000 },
    ],
    feb_amount: null, exemption: null,
    source: "West Bengal State Tax on Professions Act 1979",
    source_url: "https://taxguru.in/corporate-law/state-wise-professional-tax-slab-rates-2024-2025.html",
    effective: "in force", verified: VERIFIED_ON },
  { state_code: "TS", state_name: "Telangana", basis: "monthly",
    slabs: [
      { min: 0,        max: 1500000, pt_monthly: 0 },
      { min: 1500000,  max: 2000000, pt_monthly: 15000 },
      { min: 2000000,  max: null,    pt_monthly: 20000 },
    ],
    feb_amount: null, exemption: null,
    source: "Telangana Tax on Professions Act 1987",
    source_url: "https://taxguru.in/corporate-law/state-wise-professional-tax-slab-rates-2024-2025.html",
    effective: "in force", verified: VERIFIED_ON },
  { state_code: "GJ", state_name: "Gujarat", basis: "monthly",
    slabs: [
      { min: 0,        max: 1200000, pt_monthly: 0 },
      { min: 1200000,  max: null,    pt_monthly: 20000 },
    ],
    feb_amount: null, exemption: null,
    source: "Gujarat State Tax on Professions Act 1976",
    source_url: "https://taxguru.in/corporate-law/state-wise-professional-tax-slab-rates-2024-2025.html",
    effective: "in force", verified: VERIFIED_ON },
  { state_code: "MP", state_name: "Madhya Pradesh", basis: "monthly",
    // Bands keyed by ANNUAL income (paise). pt_monthly applies Apr-Feb (11 mo); feb_amount is the 12th-month figure.
    annual_basis: true,
    slabs: [
      { min: 0,         max: 22500000,  pt_monthly: 0,     twelfth: 0 },
      { min: 22500000,  max: 30000000,  pt_monthly: 12500, twelfth: 17400 },
      { min: 30000000,  max: 40000000,  pt_monthly: 16600, twelfth: 17400 },
      { min: 40000000,  max: null,      pt_monthly: 20800, twelfth: 21200 },
    ],
    feb_amount: null, exemption: null,
    source: "Madhya Pradesh Vritti Kar Adhiniyam 1995",
    source_url: "https://taxguru.in/corporate-law/state-wise-professional-tax-slab-rates-2024-2025.html",
    effective: "in force", verified: VERIFIED_ON,
    note: "Bands are on annual income; the 12th month carries a slightly higher figure so the year totals ≤ ₹2,500." },
  // Honest gaps — half-yearly states whose exact amounts differ across sources: ship unverified.
  { state_code: "TN", state_name: "Tamil Nadu", basis: "half-yearly",
    slabs: null, feb_amount: null, exemption: null,
    source: "Tamil Nadu (levies PT half-yearly)",
    source_url: "https://taxguru.in/corporate-law/state-wise-professional-tax-slab-rates-2024-2025.html",
    effective: "unverified", verified: null,
    note: "Levies PT on a half-yearly basis; exact slabs differ across public sources — use the manual override and confirm with your payslip." },
  { state_code: "KL", state_name: "Kerala", basis: "half-yearly",
    slabs: null, feb_amount: null, exemption: null,
    source: "Kerala (levies PT half-yearly)",
    source_url: "https://taxguru.in/corporate-law/state-wise-professional-tax-slab-rates-2024-2025.html",
    effective: "unverified", verified: null,
    note: "Levies PT on a half-yearly basis; exact slabs differ across public sources — use the manual override and confirm with your payslip." },
];

const CORPUS = { AY, VERIFIED_ON, CONSTANTS, SLABS, SURCHARGE, PT_STATES };

if (typeof module !== "undefined" && module.exports) module.exports = CORPUS;
if (typeof window !== "undefined") window.INHAND = CORPUS;
