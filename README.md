# inhand — CTC to In-Hand Salary Calculator

**Your offer letter, decoded line by line — and your salary never leaves this browser.**

inhand converts an Indian **CTC** into an honest, line-by-line **monthly in-hand** salary
breakdown where **every deduction cites the statutory rule it comes from** — EPF, EPS,
gratuity accrual, professional tax, and TDS. It models the **new and old tax regimes for
AY 2026-27 (FY 2025-26)**, compares two offers side by side, and prints a payslip-style sheet.

It is a single static page: plain HTML, CSS, and JavaScript with **no build step, no
framework, no network calls**. The page's own Content-Security-Policy sets `connect-src 'none'`,
so the salary you type **physically cannot leave your device**.

## Why

"But what's my in-hand?" is the question every offer letter fails to answer. Online
calculators bury the arithmetic and quietly log your salary. inhand shows the whole
derivation with a citation on every line, computes both regimes, and does it entirely
on your device — a job-switcher's and a fresher's tool, not a lead-gen page.

## Features

- **CTC → component table** — Basic (default 40% of CTC, editable), HRA (default 50% of Basic),
  special allowance auto-balances, with a reconciliation flag when components don't sum to CTC.
- **Derivation ledger** — every line (employer EPF, employer EPS 8.33% split at the ₹15,000
  ceiling, gratuity accrual 4.81% of basic, employee EPF 12%, state PT, monthly TDS) shows its
  amount and a tappable citation with the source and verified-on date.
- **Tax-regime toggle** — new regime (default) and old regime with HRA exemption (Rule 2A,
  metro / non-metro), one aggregate 80C field, Section 87A rebate, standard deduction, surcharge
  with marginal relief, and 4% cess — all dated **AY 2026-27**.
- **Professional tax** — verified state slabs (Maharashtra, Karnataka, West Bengal, Telangana,
  Gujarat, Madhya Pradesh) each with a verified-on date, plus a manual override for any other
  state or recent amendment.
- **The salary waterfall** — steel steps down from CTC through deductions to a single tangerine
  in-hand block (the app's motif, also on the OG card and icon).
- **Offer A vs Offer B** — monthly in-hand delta and per-line comparison.
- **Monthly / annual view**, Indian lakh-crore grouping with a plain 1,000-grouping toggle.
- **Export** — payslip-style print (print-to-PDF) and RFC-4180 CSV of the ledger. Save named
  offers to `localStorage`.

## Quickstart

```sh
# just open it — there is no build step
open index.html            # macOS
# or serve it (a static server satisfies the CSP cleanly):
python3 -m http.server 8080   # then visit http://127.0.0.1:8080/
```

Run the self-tests (Node 20+):

```sh
node --test
```

The tests re-derive every core formula (EPF/EPS split, gratuity factor, slab tax, 87A
marginal relief, surcharge marginal relief, HRA exemption, PT) and assert the brief's
fixtures to the paisa, plus corpus invariants and a 3,000-case property fuzz.

## Corpus & sources

Every statutory constant, tax slab, and PT slab lives in `data/corpus.js` with `source`,
`source_url`, `effective`, and `verified` fields. The engine (`data/engine.js`) reads its
constants **from** the corpus — no number is duplicated. All facts were verified on
**2026-07-22**; see [`sources/CITATIONS.md`](sources/CITATIONS.md).

### Deviations from the original spec (honesty)

- **Karnataka PT fixture updated.** The brief's fixture said *Karnataka ₹30,000/mo → ₹2,400/yr*.
  The **Karnataka Amendment Act 2025** (Act 33 of 2025, effective 01-Apr-2025) added a ₹300
  February deduction, making the annual total **₹2,500** (₹200×11 + ₹300). Verified 2026-07-22;
  the self-test asserts the current ₹2,500 figure.
- **v0.1 ships 6 verified PT states**, not the full 22 (the brief's own blocker fix). MH, KA, WB,
  TS, GJ, MP are verified; every other state uses the manual override.
- **Tamil Nadu and Kerala ship as `slabs: null`** (labelled *unverified*, with the manual
  override). They levy PT **half-yearly** and the public secondary sources disagree on the exact
  amounts — per the corpus rule, a money number is never guessed, so they are deliberately left
  unverified rather than fabricated.

## Privacy

- **No network, ever.** `connect-src 'none'` in the page's CSP means the browser blocks every
  fetch/XHR/WebSocket. There is no analytics, no CDN, no external font.
- Saved offers live only in this browser's `localStorage`. Clearing site data erases them;
  the CSV and print exports are your only backup.

## Disclaimer

**inhand is an estimate, not a payslip — and not tax, legal, or investment advice.** It models
**AY 2026-27 (FY 2025-26) only**, dated on screen. Employer CTC structures vary; TDS is shown as
annual tax ÷ 12, not the exact Section-192 month-by-month computation; professional-tax slabs
change by state and carry a verified-on date with a manual override. Gratuity is an employer-cost
accrual (4.81% of basic), normally payable only after 5 years of continuous service — not monthly
cash in hand. ESOPs, flexi baskets, and Chapter VI-A deductions beyond 80C are not modelled. Edit
the components to match your offer letter and **verify against your first payslip and a
professional** before relying on any figure.

The software is provided "as is", without warranty of any kind; see [LICENSE](LICENSE).

## License

MIT © 2026 Sreenivas Sadhu Prabhakara.
