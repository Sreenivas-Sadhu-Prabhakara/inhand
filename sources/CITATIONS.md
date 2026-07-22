# Sources & Citations — inhand corpus

Every statutory constant, tax slab, and professional-tax slab in `data/corpus.js` carries
`source`, `source_url`, `effective`, and `verified` fields. This file records the
verification pass. All web checks were done on **2026-07-22** (the `verified` date
stamped in the corpus and shown in-app).

Tax year modelled: **AY 2026-27 (FY 2025-26)** only.

## A. Income-tax slabs & rebate (Finance Act 2025 / Income-tax Act 1961)

- **New-regime slabs AY 2026-27** — 0–4L nil, 4–8L 5%, 8–12L 10%, 12–16L 15%,
  16–20L 20%, 20–24L 25%, above 24L 30%.
  Verified 2026-07-22 against multiple independent summaries of the Finance Act 2025
  First Schedule (incometax.gov.in slab pages; bajajfinserv, taxgarden, indianpaycalculator
  summaries agree). Cross-checked worked example: taxable ₹24,00,000 → ₹3,00,000 before cess.
- **Section 87A rebate (new regime)** — up to ₹60,000, available where total income ≤ ₹12,00,000;
  makes income up to ₹12L tax-free. With ₹75,000 standard deduction, salaried gross up to
  ₹12,75,000 pays nil. Verified 2026-07-22 (tax2win, canarahsbclife 87A guides; consistent).
- **Section 87A rebate (old regime)** — ₹12,500, income ≤ ₹5,00,000. (Rebate ceiling ₹7L is a
  common secondary claim but the statutory 87A old-regime rebate amount is ₹12,500 up to ₹5L;
  we model the ₹12,500/₹5L pair as in the brief.)
- **Standard deduction** — ₹75,000 (new regime) / ₹50,000 (old regime) for salaried. Verified 2026-07-22.
- **Surcharge tiers** — 10% > ₹50L, 15% > ₹1Cr, 25% > ₹2Cr (new-regime surcharge capped at 25%).
  Marginal relief applied at each threshold. 4% health-and-education cess on tax + surcharge.
  Verified 2026-07-22. Worked check: taxable ₹50,00,100 → surcharge marginal relief caps the
  extra tax at exactly ₹100; taxable ₹60,00,000 → full 10% surcharge.
- **Old-regime slabs (individual < 60)** — 0–2.5L nil, 2.5–5L 5%, 5–10L 20%, above 10L 30%.
  Verified 2026-07-22 (axismaxlife, taxconcept; unchanged from prior years). Worked check:
  taxable ₹10,00,000 → ₹1,12,500 + 4% cess = ₹1,17,000.
- **HRA exemption (old regime), Sec 10(13A) / Rule 2A** — exempt = min(actual HRA,
  rent − 10% of basic, 50% of basic [metro] / 40% [non-metro]). Worked check: basic ₹50k, HRA ₹25k,
  rent ₹20k/mo, metro → ₹15,000/mo → ₹1,80,000/yr exempt.
- **80C cap** — ₹1,50,000 (old regime). One aggregate field only.

## B. Provident fund, pension, gratuity, professional-tax cap

- **EPF employee 12% of (basic + DA)** — EPF Scheme 1952, para 29. Verified 2026-07-22.
- **Employer 12% split: EPS 8.33% of pensionable wage, balance to EPF** — the EPS 8.33% is
  computed on the statutory wage ceiling **₹15,000/month** (GSR 609(E), effective 01-09-2014),
  so max EPS = ₹1,250/month; employer EPF = employer 12% − EPS. Verified 2026-07-22
  (epfindia.gov.in contribution-rate note; pensionbazaar, lawrbit summaries agree).
  Worked check: basic ₹40,000 → employer 12% ₹4,800, EPS ₹1,250, employer EPF ₹3,550.
- **Gratuity accrual factor 15/26 per year → 4.81% of basic** — Payment of Gratuity Act 1972,
  s.4(2) (15 days' wages per completed year, 26-day month). Re-derived in a self-test:
  |15/26/12 − 0.0481| < 1e-4. Annotation: normally payable only after 5 years continuous service.
- **Article 276(2) professional-tax cap** — total PT levied by a State ≤ ₹2,500 per year.
  Constitutional cap; used as a corpus-wide sanity property in the self-tests.

## C. Professional tax — state slabs (v0.1 verified set)

Per the brief's blocker fix, v0.1 ships a **6-state verified corpus** with a manual-override
field for every other state. Verified monthly-basis states below (all worst-case annual ≤ ₹2,500):

- **Maharashtra (MH)** — ₹0 up to ₹7,500; ₹175/mo ₹7,501–₹10,000; ₹200/mo above ₹10,000,
  with **₹300 in February** (₹200×11 + ₹300 = ₹2,500/yr). Women exempt up to ₹25,000/mo.
  Verified 2026-07-22 (saral.pro, taxguru state tables).
- **Karnataka (KA)** — ₹0 up to ₹24,999; **₹200/mo above ₹25,000, ₹300 in February**
  (₹2,500/yr). Karnataka Amendment Act 2025 (Act 33 of 2025, assent 10-Apr-2025), effective
  **01-04-2025**. Verified 2026-07-22 (pcsmgmt amendment note, beaconfiling). **NOTE:** this
  supersedes the older KA slab (₹200 flat, ₹2,400/yr) — see DEVIATIONS in README.
- **West Bengal (WB)** — ₹0 up to ₹10,000; ₹110 ₹10,001–₹15,000; ₹130 ₹15,001–₹25,000;
  ₹150 ₹25,001–₹40,000; ₹200 above ₹40,000. Verified 2026-07-22 (saral.pro, taxguru).
- **Telangana (TS)** — ₹0 up to ₹15,000; ₹150 ₹15,001–₹20,000; ₹200 above ₹20,000.
  Verified 2026-07-22 (taxguru).
- **Gujarat (GJ)** — ₹0 up to ₹12,000; ₹200/mo above ₹12,000. Verified 2026-07-22 (taxguru, saral.pro).
- **Madhya Pradesh (MP)** — ₹0 up to ₹2,25,000/yr; ₹208×11 + ₹212 (last month) for income
  above ₹4,00,000/yr (₹2,500/yr); lower bands ₹125/₹166 per taxguru. Verified 2026-07-22 (taxguru).

**Deliberately NOT shipped as slabs (honest gap):** Tamil Nadu and Kerala are *half-yearly*
levies and the two independent secondary sources disagree on the exact half-yearly amounts.
Rather than guess a money number, TN and KL ship as `slabs: null` with a note directing the
user to the manual PT override — exactly the brief's "never a guessed number" rule. Any other
state also uses the manual override.

## Source URLs (accessed 2026-07-22)

- Income tax slabs FY 2025-26 / AY 2026-27: https://www.indianpaycalculator.in/income-tax-slabs
- Bajaj Finserv slab summary: https://www.bajajfinserv.in/investments/income-tax-slabs
- Section 87A (Tax2win): https://tax2win.in/guide/section-87a
- Old regime slabs (Axis Max Life): https://www.axismaxlife.com/blog/tax-savings/income-tax-slab-2025-26
- EPFO contribution rates: https://www.epfindia.gov.in/site_docs/PDFs/MiscPDFs/ContributionRate.pdf
- EPS employer split: https://www.pensionbazaar.com/epf/employer-epf-contribution/
- Karnataka PT Amendment Act 2025: https://blog.pcsmgmt.com/2025/04/karnataka-professional-tax-slab-revised-amendment-act-2025.html
- Karnataka PT (Beacon): https://beaconfiling.com/india/karnataka-professional-tax
- State PT slabs (Saral): https://saral.pro/blogs/professional-tax-slab-rates-in-different-states/
- State-wise PT (TaxGuru 2024-25): https://taxguru.in/corporate-law/state-wise-professional-tax-slab-rates-2024-2025.html

> These are informational summaries of the underlying statutes. inhand is an estimate, not a
> payslip or tax opinion — verify against your actual offer letter, payslip, and a professional.
