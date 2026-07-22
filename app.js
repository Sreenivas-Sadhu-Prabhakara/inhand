/* ============================================================================
   inhand — app glue. All logic; no inline handlers (CSP forbids inline script).
   Reads corpus (window.INHAND) and the pure engine (window.INHAND_ENGINE).
   Money is INTEGER PAISE throughout; formatted for display only.
   ============================================================================ */
(function () {
  "use strict";
  const CORPUS = window.INHAND;
  const E = window.INHAND_ENGINE;
  if (!CORPUS || !E) return;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const R = (rupees) => Math.round(rupees * 100); // rupees → paise

  const LS_KEY = "inhand:offers:v1";

  // ---- state: two offers ----
  const defaultOffer = () => ({
    ctc: 1800000, basicPct: 40, hraPct: 50,
    regime: "new", rent: 0, metro: "metro", sec80c: 0,
    ptState: "", ptOverride: 0, isWoman: false,
    view: "monthly", grouping: false, name: "",
  });
  const state = { A: defaultOffer(), B: defaultOffer(), active: "A", compare: false };

  // ---- money formatting ----
  function groupIndian(intStr) {
    // intStr: whole-rupee string of digits
    if (intStr.length <= 3) return intStr;
    const last3 = intStr.slice(-3);
    let rest = intStr.slice(0, -3);
    rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    return rest + "," + last3;
  }
  function fmtPaise(paise, grouping) {
    const neg = paise < 0;
    const rupees = Math.round(Math.abs(paise) / 100);
    const s = String(rupees);
    const grouped = grouping ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : groupIndian(s);
    return (neg ? "−₹" : "₹") + grouped;
  }
  function ctcToWords(ctc) {
    if (!ctc) return "";
    if (ctc >= 10000000) return "≈ ₹" + (ctc / 10000000).toFixed(2).replace(/\.?0+$/, "") + " crore";
    if (ctc >= 100000) return "≈ ₹" + (ctc / 100000).toFixed(2).replace(/\.?0+$/, "") + " lakh";
    return "";
  }

  // ---- populate PT states ----
  function populateStates() {
    const sel = $("#ptState");
    sel.innerHTML = '<option value="">— select state (optional) —</option>';
    for (const st of CORPUS.PT_STATES) {
      const opt = document.createElement("option");
      opt.value = st.state_code;
      opt.textContent = st.state_name + (st.slabs ? "" : " (unverified)");
      sel.appendChild(opt);
    }
  }

  // ---- compute one offer → structured result (all paise) ----
  function compute(o) {
    const ctc = R(o.ctc);
    const overrides = {
      basic: Math.round((o.basicPct / 100) * ctc),
    };
    overrides.hra = Math.round((o.hraPct / 100) * overrides.basic);
    const comp = E.deriveComponents(ctc, overrides);

    const basicMonthly = E.round(comp.basic / 12);
    const pf = E.pfSplit(basicMonthly);

    // gross cash (annual) = basic + hra + special + other (employer PF & gratuity are CTC cost, not cash)
    const grossCashAnnual = comp.basic + comp.hra + comp.special + comp.otherFixed;

    // taxable income
    let taxable;
    let hraExempt = 0;
    if (o.regime === "new") {
      taxable = Math.max(0, grossCashAnnual - E.STD_DED.new);
    } else {
      // old regime: HRA exemption + std ded + 80C
      hraExempt = E.hraExemption({
        basicAnnual: comp.basic, hraAnnual: comp.hra,
        rentAnnual: R(o.rent) * 12, metro: o.metro === "metro",
      });
      const c80 = Math.min(R(o.sec80c), E.C.sec80c_cap);
      taxable = Math.max(0, grossCashAnnual - hraExempt - E.STD_DED.old - c80);
    }
    const tax = E.annualTax(taxable, o.regime);
    const tdsMonthly = E.round(tax.total / 12);

    // professional tax
    const st = CORPUS.PT_STATES.find(s => s.state_code === o.ptState);
    let ptAnnual = 0, ptUnverified = false;
    if (st && st.slabs) {
      const monthlyWage = E.round(grossCashAnnual / 12);
      ptAnnual = E.ptAnnualForState(st, monthlyWage, grossCashAnnual, o.isWoman) || 0;
    } else if (st && !st.slabs) {
      ptUnverified = true;
      ptAnnual = Math.min(R(o.ptOverride), E.C.pt_annual_cap);
    } else if (o.ptOverride) {
      ptAnnual = Math.min(R(o.ptOverride), E.C.pt_annual_cap);
    }
    const ptMonthly = E.round(ptAnnual / 12);

    const grossMonthly = E.round(grossCashAnnual / 12);
    const inHandMonthly = grossMonthly - pf.employee - ptMonthly - tdsMonthly;

    return {
      ctc, comp, pf, grossCashAnnual, grossMonthly,
      taxable, tax, tdsMonthly, hraExempt,
      ptAnnual, ptMonthly, ptUnverified, ptState: st,
      inHandMonthly, inHandAnnual: inHandMonthly * 12,
      regime: o.regime,
    };
  }

  // ---- ledger rows (returns array for render + CSV) ----
  function buildLedger(res, o) {
    const per = o.view === "monthly" ? (p) => E.round(p / 12) : (p) => p;
    const rows = [];
    const cite = (id) => id; // rule-id marker resolved at render for the dialog

    rows.push({ kind: "group", label: "Cost to company", amount: res.ctc, rule: "" });
    rows.push({ kind: "line", label: "Basic (" + o.basicPct + "% of CTC)", amount: res.comp.basic, rule: "basic_convention" });
    rows.push({ kind: "line", label: "HRA (" + o.hraPct + "% of Basic)", amount: res.comp.hra, rule: "hra_convention" });
    rows.push({ kind: "line", label: "Special allowance (balances CTC)", amount: res.comp.special, rule: "special_convention" });
    rows.push({ kind: "sub", label: "Employer EPF (CTC cost, not cash)", amount: res.pf.employerEpf * 12, rule: "epf_employer_rate" });
    rows.push({ kind: "sub", label: "Employer EPS (CTC cost, not cash)", amount: res.pf.eps * 12, rule: "eps_rate" });
    rows.push({ kind: "sub", label: "Gratuity accrual (4.81% basic, after 5 yrs)", amount: res.comp.gratuityAnnual, rule: "gratuity_factor" });

    rows.push({ kind: "group", label: "Monthly cash gross", amount: res.grossCashAnnual, rule: "" });
    rows.push({ kind: "deduct", label: "− EPF (employee, 12% of basic)", amount: -res.pf.employee * 12, rule: "epf_employee_rate" });
    const ptLabel = res.ptState
      ? "− Professional tax (" + res.ptState.state_name + ")" + (res.ptUnverified ? "" : "")
      : "− Professional tax";
    rows.push({ kind: "deduct", label: ptLabel, amount: -res.ptAnnual, rule: res.ptState ? "pt_state:" + res.ptState.state_code : "pt_annual_cap", unverified: res.ptUnverified });
    rows.push({ kind: "deduct", label: "− TDS (annual tax ÷ 12, estimate)", amount: -res.tax.total, rule: "regime:" + res.regime });

    rows.push({ kind: "inhand", label: "In-hand", amount: res.inHandMonthly * 12, rule: "" });
    return rows.map(r => ({ ...r, display: per(r.amount) }));
  }

  // ---- citation dialog content ----
  function citationFor(ruleId) {
    if (ruleId === "basic_convention")
      return { title: "Basic pay — market convention", body: "Basic is commonly set at 30–50% of CTC. inhand defaults to 40% and is fully editable to match your offer letter.", src: "Convention, not statute — edit to match your letter." };
    if (ruleId === "hra_convention")
      return { title: "HRA — market convention", body: "House Rent Allowance is commonly 40–50% of Basic. inhand defaults to 50% and is editable. HRA exemption (old regime) follows Rule 2A.", src: "Convention; exemption per s.10(13A) / Rule 2A." };
    if (ruleId === "special_convention")
      return { title: "Special allowance", body: "The special (or balancing) allowance is whatever remains of CTC after basic, HRA, employer PF and gratuity accrual. It is fully taxable cash.", src: "Balancing figure so components sum to CTC." };
    if (ruleId.startsWith("pt_state:")) {
      const code = ruleId.split(":")[1];
      const st = CORPUS.PT_STATES.find(s => s.state_code === code);
      return { title: "Professional tax — " + st.state_name, body: (st.note || "State-levied professional tax slab.") + (st.exemption ? " " + st.exemption : ""), src: st.source + " — " + st.source_url + " (verified " + (st.verified || "unverified") + ")" };
    }
    if (ruleId.startsWith("regime:")) {
      const regime = ruleId.split(":")[1];
      const slab = CORPUS.SLABS.find(s => s.regime === regime);
      return { title: "Income tax — " + (regime === "new" ? "new" : "old") + " regime, " + CORPUS.AY, body: "TDS is annual income tax ÷ 12 (an estimate, not the exact Section-192 monthly computation). Includes Section 87A rebate, standard deduction, surcharge with marginal relief and 4% cess.", src: slab.source + " — " + slab.source_url + " (verified " + slab.verified + ")" };
    }
    const c = CORPUS.CONSTANTS.find(x => x.id === ruleId);
    if (c) return { title: c.label, body: (c.note || (c.applies_to ? "Applies to: " + c.applies_to + "." : "")) + " Value: " + c.value + " (" + c.unit + ").", src: c.source + " — " + c.source_url + " (verified " + c.verified + ", effective " + c.effective + ")" };
    return { title: "Citation", body: "See sources/CITATIONS.md.", src: "" };
  }

  // ---- render ----
  function render() {
    const o = state[state.active];
    const res = compute(o);
    const grouping = o.grouping;

    $("#hlLabel").textContent = (o.view === "monthly" ? "Monthly" : "Annual") + " in-hand";
    const hl = o.view === "monthly" ? res.inHandMonthly : res.inHandAnnual;
    $("#hlFigure").textContent = fmtPaise(hl, grouping);
    $("#hlSub").textContent = (o.regime === "new" ? "New regime" : "Old regime") + " · " + CORPUS.AY +
      " · " + (o.view === "monthly" ? "≈ " + fmtPaise(res.inHandAnnual, grouping) + " / yr" : "≈ " + fmtPaise(res.inHandMonthly, grouping) + " / mo");

    // reconciliation flag
    const rec = $("#reconcile");
    if (!res.comp.reconciles) {
      rec.hidden = false;
      rec.textContent = "Components do not sum to CTC (off by " + fmtPaise(res.comp.reconileDelta, grouping) + "). Adjust Basic% / HRA%.";
    } else if (res.comp.special < 0) {
      rec.hidden = false;
      rec.textContent = "Basic + HRA + employer costs exceed CTC — special allowance is negative. Lower Basic% or HRA%.";
    } else {
      rec.hidden = true;
    }

    // ledger
    const rows = buildLedger(res, o);
    const tb = $("#ledgerBody");
    tb.innerHTML = "";
    for (const r of rows) {
      const tr = document.createElement("tr");
      tr.className = "row--" + (r.kind === "group" ? "group" : r.kind === "sub" ? "sub" : r.kind === "inhand" ? "inhand" : r.kind === "deduct" ? "deduct" : "line");
      const tdL = document.createElement("td");
      tdL.textContent = r.label;
      if (r.unverified) {
        const b = document.createElement("span"); b.className = "badge badge--unverified"; b.textContent = "unverified"; tdL.appendChild(b);
      }
      const tdA = document.createElement("td");
      tdA.className = "num";
      if (r.display < 0) tdA.classList.add("amt-neg");
      tdA.textContent = fmtPaise(r.display, grouping);
      const tdR = document.createElement("td");
      if (r.rule) {
        const btn = document.createElement("button");
        btn.type = "button"; btn.className = "cite-btn";
        const c = citationFor(r.rule);
        btn.textContent = c.title.replace(/^([^—]+—\s*)?/, "").slice(0, 42) || "rule";
        btn.setAttribute("data-rule", r.rule);
        btn.addEventListener("click", () => openCite(r.rule));
        tdR.appendChild(btn);
      } else {
        tdR.textContent = "";
      }
      tr.append(tdL, tdA, tdR);
      tb.appendChild(tr);
    }

    drawWaterfall(res, grouping);
    renderCompare(grouping);
    persist();
  }

  function openCite(ruleId) {
    const c = citationFor(ruleId);
    $("#citeTitle").textContent = c.title;
    $("#citeBody").textContent = c.body;
    $("#citeSrc").textContent = c.src;
    const d = $("#citeDialog");
    if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
  }

  // ---- waterfall SVG ----
  function drawWaterfall(res, grouping) {
    const svg = $("#waterfall");
    svg.innerHTML = "";
    const W = 720, H = 260, padL = 8, padR = 8, base = 214, top = 24;
    const steps = [
      { label: "CTC", value: res.ctc / 12, cls: "wf-bar--ctc" },
      { label: "Employer\ncosts", value: -(res.pf.employerEpf + res.pf.eps + E.round(res.comp.gratuityAnnual / 12)), cls: "wf-bar" },
      { label: "EPF", value: -res.pf.employee, cls: "wf-bar" },
      { label: "PT", value: -res.ptMonthly, cls: "wf-bar" },
      { label: "TDS", value: -res.tdsMonthly, cls: "wf-bar" },
      { label: "In-hand", value: res.inHandMonthly, cls: "wf-bar--inhand", terminal: true },
    ];
    const maxV = res.ctc / 12 || 1;
    const scale = (base - top) / maxV;
    const n = steps.length;
    const gap = 14;
    const bw = (W - padL - padR - gap * (n - 1)) / n;
    const NS = "http://www.w3.org/2000/svg";
    let running = 0;
    let prevTopY = null, prevX = null;
    steps.forEach((s, i) => {
      const x = padL + i * (bw + gap);
      let y0, y1, val;
      if (i === 0) { val = s.value; y1 = base; y0 = base - val * scale; running = val; }
      else if (s.terminal) { val = s.value; y1 = base; y0 = base - val * scale; }
      else { val = s.value; const start = running; running = running + val; y0 = base - Math.max(start, running) * scale; y1 = base - Math.min(start, running) * scale; }
      const h = Math.max(2, Math.abs(y1 - y0));
      const rect = document.createElementNS(NS, "rect");
      rect.setAttribute("x", x.toFixed(1)); rect.setAttribute("y", Math.min(y0, y1).toFixed(1));
      rect.setAttribute("width", bw.toFixed(1)); rect.setAttribute("height", h.toFixed(1));
      rect.setAttribute("rx", "3"); rect.setAttribute("class", s.cls);
      svg.appendChild(rect);
      // connector line from previous bar bottom-of-running to this
      if (prevX !== null && !s.terminal) {
        const line = document.createElementNS(NS, "path");
        const yConn = base - (running - val) * scale;
        line.setAttribute("d", `M ${(prevX + bw).toFixed(1)} ${yConn.toFixed(1)} L ${x.toFixed(1)} ${yConn.toFixed(1)}`);
        line.setAttribute("class", "wf-conn");
        svg.appendChild(line);
      }
      // label
      const lbl = document.createElementNS(NS, "text");
      lbl.setAttribute("x", (x + bw / 2).toFixed(1)); lbl.setAttribute("y", (base + 16).toFixed(1));
      lbl.setAttribute("text-anchor", "middle"); lbl.setAttribute("class", "wf-label");
      s.label.split("\n").forEach((ln, k) => {
        const ts = document.createElementNS(NS, "tspan");
        ts.setAttribute("x", (x + bw / 2).toFixed(1)); ts.setAttribute("dy", k === 0 ? "0" : "13");
        ts.textContent = ln; lbl.appendChild(ts);
      });
      svg.appendChild(lbl);
      // value on top
      const vt = document.createElementNS(NS, "text");
      vt.setAttribute("x", (x + bw / 2).toFixed(1)); vt.setAttribute("y", (Math.min(y0, y1) - 5).toFixed(1));
      vt.setAttribute("text-anchor", "middle"); vt.setAttribute("class", "wf-val" + (s.terminal ? " wf-val--inhand" : ""));
      vt.textContent = fmtPaise(Math.abs(val), grouping);
      svg.appendChild(vt);
      prevX = x; prevTopY = Math.min(y0, y1);
    });
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  }

  // ---- compare ----
  function renderCompare(grouping) {
    const card = $("#compareCard");
    if (!state.compare) { card.hidden = true; return; }
    card.hidden = false;
    const a = compute(state.A), b = compute(state.B);
    const lines = [
      ["Monthly in-hand", a.inHandMonthly, b.inHandMonthly],
      ["Monthly gross", a.grossMonthly, b.grossMonthly],
      ["EPF (employee)", a.pf.employee, b.pf.employee],
      ["Professional tax", a.ptMonthly, b.ptMonthly],
      ["TDS (est.)", E.round(a.tax.total / 12), E.round(b.tax.total / 12)],
    ];
    const body = $("#compareBody");
    body.innerHTML = "";
    const grid = document.createElement("div"); grid.className = "cmp-grid";
    ["Line", "Offer A", "Offer B", "Δ (A−B)"].forEach(h => {
      const d = document.createElement("div"); d.className = "cmp-h" + (h !== "Line" ? " num" : ""); d.textContent = h; grid.appendChild(d);
    });
    for (const [label, av, bv] of lines) {
      const d0 = document.createElement("div"); d0.textContent = label; grid.appendChild(d0);
      const d1 = document.createElement("div"); d1.className = "num"; d1.textContent = fmtPaise(av, grouping); grid.appendChild(d1);
      const d2 = document.createElement("div"); d2.className = "num"; d2.textContent = fmtPaise(bv, grouping); grid.appendChild(d2);
      const dd = document.createElement("div"); dd.className = "num";
      const delta = av - bv;
      dd.textContent = (delta >= 0 ? "+" : "") + fmtPaise(delta, grouping).replace("−", "");
      if (label === "Monthly in-hand") dd.classList.add(delta >= 0 ? "cmp-delta--up" : "cmp-delta--down");
      grid.appendChild(dd);
    }
    body.appendChild(grid);
    const v = document.createElement("p"); v.className = "cmp-verdict";
    const diff = a.inHandMonthly - b.inHandMonthly;
    if (diff === 0) v.textContent = "Both offers give the same monthly in-hand.";
    else {
      const winner = diff > 0 ? "Offer A" : "Offer B";
      v.innerHTML = "<strong>" + winner + "</strong> pays " + fmtPaise(Math.abs(diff), grouping).replace("−", "") + " more in hand per month (≈ " + fmtPaise(Math.abs(diff) * 12, grouping).replace("−", "") + " / yr).";
    }
    body.appendChild(v);
  }

  // ---- CSV export (RFC-4180) ----
  function toCSV(rows) {
    const esc = (v) => { const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return rows.map(r => r.map(esc).join(",")).join("\r\n");
  }
  function exportCSV() {
    const o = state[state.active];
    const res = compute(o);
    const rows = buildLedger(res, o);
    const out = [["Line", "Annual (INR)", "Monthly (INR)", "Rule"]];
    for (const r of rows) {
      const annual = Math.round(r.amount / 100);
      const monthly = Math.round(r.amount / 1200);
      out.push([r.label.replace(/−/g, "-"), String(annual), String(monthly), r.rule || ""]);
    }
    const blob = new Blob([toCSV(out)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "inhand-" + (o.name || o.active || "offer").replace(/\s+/g, "-") + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---- persistence ----
  function persist() {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ A: state.A, B: state.B })); } catch (e) { /* ignore quota */ }
  }
  function loadPersisted() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) { const p = JSON.parse(raw); if (p.A) state.A = { ...defaultOffer(), ...p.A }; if (p.B) state.B = { ...defaultOffer(), ...p.B }; }
    } catch (e) { /* ignore */ }
  }
  const NAMED_KEY = "inhand:named:v1";
  function savedList() { try { return JSON.parse(localStorage.getItem(NAMED_KEY) || "{}"); } catch (e) { return {}; } }
  function refreshLoadSel() {
    const sel = $("#loadSel"); const named = savedList();
    sel.innerHTML = '<option value="">Load saved…</option>';
    Object.keys(named).forEach(k => { const o = document.createElement("option"); o.value = k; o.textContent = k; sel.appendChild(o); });
  }

  // ---- form → state sync ----
  function syncFromForm() {
    const o = state[state.active];
    o.ctc = Math.max(0, +$("#ctc").value || 0);
    o.basicPct = Math.min(100, Math.max(1, +$("#basicPct").value || 40));
    o.hraPct = Math.min(100, Math.max(0, +$("#hraPct").value || 0));
    o.regime = $('input[name="regime"]:checked').value;
    o.rent = Math.max(0, +$("#rent").value || 0);
    o.metro = $('input[name="metro"]:checked').value;
    o.sec80c = Math.max(0, +$("#sec80c").value || 0);
    o.ptState = $("#ptState").value;
    o.ptOverride = Math.max(0, +$("#ptOverride").value || 0);
    o.isWoman = $('input[name="isWoman"]').checked;
    o.view = $('input[name="view"]:checked').value;
    o.grouping = $('input[name="grouping"]').checked;
    o.name = $("#scenName").value.trim();
  }
  function syncToForm() {
    const o = state[state.active];
    $("#ctc").value = o.ctc; $("#basicPct").value = o.basicPct; $("#hraPct").value = o.hraPct;
    $$('input[name="regime"]').forEach(r => r.checked = r.value === o.regime);
    $("#rent").value = o.rent; $$('input[name="metro"]').forEach(r => r.checked = r.value === o.metro);
    $("#sec80c").value = o.sec80c; $("#ptState").value = o.ptState; $("#ptOverride").value = o.ptOverride;
    $('input[name="isWoman"]').checked = o.isWoman;
    $$('input[name="view"]').forEach(r => r.checked = r.value === o.view);
    $('input[name="grouping"]').checked = o.grouping;
    $("#scenName").value = o.name;
    updateConditionalUI();
  }
  function updateConditionalUI() {
    const o = state[state.active];
    $("#oldOnly").hidden = o.regime !== "old";
    const st = CORPUS.PT_STATES.find(s => s.state_code === o.ptState);
    const note = $("#ptNote");
    const ovWrap = $("#ptOverrideWrap");
    if (st && !st.slabs) { note.textContent = st.note || "Slabs unverified — use the manual override."; ovWrap.hidden = false; }
    else if (st) { note.textContent = "Verified " + st.verified + ". " + (st.note || ""); ovWrap.hidden = true; }
    else { note.textContent = "No state selected — professional tax is ₹0 unless you enter an override."; ovWrap.hidden = false; }
    $("#ctcWords").textContent = ctcToWords(o.ctc);
  }

  // ---- events ----
  function onInput() { syncFromForm(); updateConditionalUI(); render(); }

  function init() {
    populateStates();
    loadPersisted();
    $("#ayBadge").textContent = "Assessment year " + CORPUS.AY;
    $("#verifiedOn").textContent = "Constants verified " + CORPUS.VERIFIED_ON;
    refreshLoadSel();
    syncToForm();

    $("#controls").addEventListener("input", onInput);
    $("#controls").addEventListener("change", onInput);

    $$('input[name="activeOffer"]').forEach(r => r.addEventListener("change", () => {
      state.active = $('input[name="activeOffer"]:checked').value;
      syncToForm(); render();
    }));

    $("#compareToggle").addEventListener("click", () => {
      state.compare = !state.compare;
      const btn = $("#compareToggle");
      btn.setAttribute("aria-pressed", String(state.compare));
      btn.classList.toggle("compareToggle--on", state.compare);
      render();
    });

    $("#printBtn").addEventListener("click", () => window.print());
    $("#csvBtn").addEventListener("click", exportCSV);

    $("#saveBtn").addEventListener("click", () => {
      syncFromForm();
      const name = state[state.active].name || ("Offer " + state.active);
      const named = savedList(); named[name] = { ...state[state.active], name };
      try { localStorage.setItem(NAMED_KEY, JSON.stringify(named)); } catch (e) { /* ignore */ }
      refreshLoadSel();
    });
    $("#loadSel").addEventListener("change", (e) => {
      const name = e.target.value; if (!name) return;
      const named = savedList(); if (named[name]) { state[state.active] = { ...defaultOffer(), ...named[name] }; syncToForm(); render(); }
    });

    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
