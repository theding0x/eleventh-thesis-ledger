(function () {
  "use strict";
  var root = document.getElementById("root");
  var D = null;
  var tab = "contributions";
  try { var t = localStorage.getItem("eleve-tab"); if (t) tab = t; } catch (e) {}
  var h = (location.hash || "").replace("#", ""); if (h) tab = h;

  function mil(n) { if (n == null || isNaN(n)) return "–"; var a = Math.abs(n); var s = a >= 1e9 ? (a / 1e9).toFixed(2) + " B" : a >= 1e6 ? (a / 1e6).toFixed(2) + " M" : Math.round(a).toLocaleString("en-US"); return (n < 0 ? "−" : "") + s; }
  function num(n, d) { if (n == null || isNaN(n)) return "–"; return Number(n).toLocaleString("en-US", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
  function sum(arr, f) { return (arr || []).reduce(function (a, r) { return a + (Number(f(r)) || 0); }, 0); }

  function chip(v) {
    var s = String(v || "").toLowerCase();
    var cls = /paid|sold|delivered|repayment/.test(s) ? "good" : /held|queued|in progress|advance|estimate/.test(s) ? "warn" : "";
    return '<span class="chip ' + cls + '">' + esc(v) + "</span>";
  }

  var BOOKS = {
    contributions: { label: "Contributions", intro: "Every item-exchange contract to the corporation, valued at the Jita 4-4 buy price on the day of delivery (Art. III). Shares are earned at one per 10,000,000 ISK of value (Art. V).",
      empty: "No contributions yet. The first member contract to the corp appears here as soon as it is accepted.",
      cols: [["date", "Date", "date"], ["member", "Member"], ["item", "Item"], ["qty", "Qty", "int"], ["unit", "Unit value", "isk"], ["value", "Value", "isk"], ["status", "Status", "chip"], ["note", "Note"]], total: "value" },
    production: { label: "Production", intro: "Corporation manufacturing jobs and what they will yield. Stock is valued when sold, in the Sales book.",
      empty: "No production recorded.",
      cols: [["date", "Started", "date"], ["product", "Product"], ["runs", "Runs", "int"], ["units", "Units", "int"], ["location", "Location"], ["status", "Status", "chip"], ["note", "Note"]] },
    sales: { label: "Sales", intro: "What the collective sold, where, and what it netted after broker fees and sales tax.",
      empty: "No sales yet. The first Nova Heavy Missile batch is in production.",
      cols: [["date", "Date", "date"], ["item", "Item"], ["qty", "Qty", "int"], ["gross", "Gross", "isk"], ["fees", "Fees and tax", "isk"], ["net", "Net", "isk"], ["market", "Market"], ["note", "Note"]], total: "net" },
    costs: { label: "Costs", intro: "Everything the collective spent to produce: blueprints, materials, job fees, offices, hauling.",
      empty: "No costs recorded.",
      cols: [["date", "Date", "date"], ["category", "Category", "chip"], ["description", "Description"], ["amount", "Amount", "isk"], ["note", "Note"]], total: "amount" },
    payouts: { label: "Payouts", intro: "Money paid out to members: 90% of realized sale price for consigned goods (Art. IV), and dividends (Art. VI).",
      empty: "No payouts yet. Consignment payouts start when contributed goods sell.",
      cols: [["date", "Date", "date"], ["member", "Member"], ["kind", "Kind", "chip"], ["amount", "Amount", "isk"], ["note", "Note"]], total: "amount" },
    shares: { label: "Share register", intro: "Earned shares by member, derived from the Contributions book. Only earned shares receive dividends; the 1,000 founding shares carry votes only (Art. V.3).", derived: true },
    loans: { label: "Founder loan", intro: "Founder capital lent to the collective, interest-free. It earns no shares and no dividends, and is repaid only from the reserve (Art. VII).",
      empty: "No founder capital recorded.",
      cols: [["date", "Date", "date"], ["lender", "Lender"], ["description", "Description"], ["kind", "Kind", "chip"], ["amount", "Amount", "isk"], ["estimate", "", "est"], ["note", "Note"]] },
    distributions: { label: "Distributions", intro: "Monthly division of surplus: 40% reserve, 20% reinvestment, 40% dividend pool, with the dividend per earned share fixed at the time (Art. VI).",
      empty: "No distributions yet. The first is due at the end of the first month, even if small.",
      cols: [["date", "Date", "date"], ["surplus", "Surplus", "isk"], ["reserve", "Reserve 40%", "isk"], ["reinvest", "Reinvest 20%", "isk"], ["dividend", "Dividend pool 40%", "isk"], ["shares", "Earned shares", "dec"], ["perShare", "Per share", "isk"], ["note", "Note"]], total: "surplus" }
  };
  var ORDER = ["contributions", "production", "sales", "costs", "payouts", "shares", "loans", "distributions"];
  if (ORDER.indexOf(tab) < 0) tab = "contributions";

  // Derived fields are recomputed here so ledger.json only needs the inputs.
  function normalize() {
    ORDER.forEach(function (k) { if (!BOOKS[k].derived && !Array.isArray(D[k])) D[k] = []; });
    D.contributions.forEach(function (r) { r.value = (Number(r.qty) || 0) * (Number(r.unit) || 0); });
    D.sales.forEach(function (r) { r.net = (Number(r.gross) || 0) - (Number(r.fees) || 0); });
    var sp = D.meta.split;
    D.distributions.forEach(function (r) {
      var s = Number(r.surplus) || 0;
      r.reserve = s * sp.reserve; r.reinvest = s * sp.reinvest; r.dividend = s * sp.dividend;
      // Earned shares at the distribution date, from contributions delivered on or before it.
      r.shares = sum(D.contributions.filter(function (c) { return c.date <= r.date; }), function (c) { return c.value; }) / D.meta.shareUnit;
      r.perShare = r.shares > 0 ? r.dividend / r.shares : 0;
    });
  }

  function earnedShares() { return sum(D.contributions, function (r) { return r.value; }) / D.meta.shareUnit; }
  function figures() {
    var contributed = sum(D.contributions, function (r) { return r.value; });
    var consign = sum(D.payouts.filter(function (p) { return p.kind === "consignment"; }), function (r) { return r.amount; });
    var surplus = sum(D.sales, function (r) { return r.net; }) - consign - sum(D.costs, function (r) { return r.amount; });
    var adv = sum(D.loans.filter(function (l) { return l.kind === "advance"; }), function (r) { return r.amount; });
    var rep = sum(D.loans.filter(function (l) { return l.kind === "repayment"; }), function (r) { return r.amount; });
    var reserve = sum(D.distributions, function (r) { return r.reserve; }) - rep;
    // Cash available to pay contributors: the reserve, plus founder loans received, plus surplus not yet distributed.
    // Loans already spent on costs are netted out through the surplus (Art. IV.2, VII.4).
    var undistributed = surplus - sum(D.distributions, function (r) { return Number(r.surplus) || 0; });
    var liquidity = reserve + adv + undistributed;
    return { contributed: contributed, shares: contributed / D.meta.shareUnit, surplus: surplus, reserve: reserve, loan: adv - rep, liquidity: liquidity,
      est: D.loans.some(function (l) { return l.estimate; }), sales: D.sales.length };
  }

  function cell(r, c) {
    var v = r[c[0]], t = c[2];
    if (t === "date") return '<td class="date">' + esc(v) + "</td>";
    if (t === "isk" || t === "int") return '<td class="num">' + esc(num(v)) + "</td>";
    if (t === "dec") return '<td class="num">' + esc(num(v, 2)) + "</td>";
    if (t === "chip") return "<td>" + chip(v) + "</td>";
    if (t === "est") return "<td>" + (v ? '<span class="chip warn">estimate</span>' : "") + "</td>";
    return "<td>" + esc(v) + "</td>";
  }

  function renderBook(key) {
    var b = BOOKS[key], out = '<section class="book" id="book-' + key + '"><h2>' + esc(b.label) + '</h2><p class="intro">' + esc(b.intro) + "</p>";
    if (b.derived) return out + renderShares() + "</section>";
    var rows = D[key];
    if (!rows.length) return out + '<div class="empty">' + esc(b.empty) + "</div></section>";
    out += '<div class="tablewrap"><table><thead><tr>';
    b.cols.forEach(function (c) { out += "<th" + (/isk|int|dec/.test(c[2] || "") ? ' class="num"' : "") + ">" + esc(c[1]) + "</th>"; });
    out += "</tr></thead><tbody>";
    rows.forEach(function (r) { out += "<tr>"; b.cols.forEach(function (c) { out += cell(r, c); }); out += "</tr>"; });
    out += "</tbody>";
    if (b.total) {
      out += "<tfoot><tr>";
      b.cols.forEach(function (c, i) { out += c[0] === b.total ? '<td class="num">' + esc(num(sum(rows, function (r) { return r[b.total]; }))) + "</td>" : "<td>" + (i === 0 ? "Total" : "") + "</td>"; });
      out += "</tr></tfoot>";
    }
    return out + "</table></div></section>";
  }

  function renderShares() {
    var by = {};
    D.contributions.forEach(function (r) { var m = r.member || "Unknown"; by[m] = by[m] || { value: 0, div: 0 }; by[m].value += Number(r.value) || 0; });
    D.payouts.forEach(function (p) { if (p.kind === "dividend") { var m = p.member || "Unknown"; by[m] = by[m] || { value: 0, div: 0 }; by[m].div += Number(p.amount) || 0; } });
    var names = Object.keys(by).sort(function (a, b) { return by[b].value - by[a].value; });
    if (!names.length) return '<div class="empty">No shares earned yet. Shares appear here as contributions are recorded.</div>';
    var total = earnedShares();
    var out = '<div class="tablewrap"><table><thead><tr><th>Member</th><th class="num">Contributed value</th><th class="num">Earned shares</th><th class="num">Whole shares</th><th class="num">Share of pool</th><th class="num">Dividends received</th></tr></thead><tbody>';
    names.forEach(function (n) {
      var s = by[n].value / D.meta.shareUnit;
      out += "<tr><td>" + esc(n) + '</td><td class="num">' + num(by[n].value) + '</td><td class="num">' + num(s, 2) + '</td><td class="num">' + num(Math.floor(s)) + '</td><td class="num">' + (total > 0 ? num(s / total * 100, 1) + "%" : "–") + '</td><td class="num">' + num(by[n].div) + "</td></tr>";
    });
    return out + "</tbody></table></div>";
  }

  function tile(k, v, s, extra) { return '<div class="tile"><span class="br"></span><span class="k">' + esc(k) + '</span><span class="v' + (extra || "") + '">' + esc(v) + '</span><span class="s">' + esc(s) + "</span></div>"; }

  function render() {
    var F = figures(), liq = F.liquidity, pct = Math.max(0, Math.min(100, liq / D.meta.reserveTarget * 100));
    var repo = D.meta.repo || "";
    var html = '<header class="mast"><div class="eyebrow"><b>ELEVE</b> · Open ledger · Constitution Art. III.4</div><h1>Eleventh Thesis Ledger</h1>' +
      '<div class="meta"><span>Phase <span class="pill">' + esc(D.meta.phase) + '</span></span><span>Valued at <b>Jita 4-4 buy</b></span><span>Updated <b>' + esc(D.meta.updated) + "</b></span>" +
      (repo ? '<span><a href="' + esc(repo) + '/commits/main/ledger.json">Change history</a></span>' : "") +
      '<span><a href="ledger.json">Raw data</a></span></div></header>';
    html += '<section class="summary" aria-label="Summary">' +
      tile("Contributed value", mil(F.contributed), "Members' goods, valued at delivery") +
      tile("Earned shares", num(F.shares, 2), "1 share per 10 M ISK") +
      tile("Surplus to date", mil(F.surplus), F.sales ? "Sales, less payouts and costs" : "Costs only; first sale pending", F.surplus < 0 ? " neg" : "") +
      '<div class="tile"><span class="br"></span><span class="k">Payment liquidity</span><span class="v">' + mil(liq) + '</span><div class="meter" role="img" aria-label="' + num(pct, 1) + '% of 500 M target"><i style="width:' + pct + '%"></i></div><span class="s">Reserve, unspent founder loans and undistributed surplus · ' + num(pct, 1) + "% of 500 M, when instant payment starts (Art. IV.2, VII.4)</span></div>" +
      tile("Founder loan", mil(F.loan), F.est ? "Outstanding; includes estimates" : "Outstanding, interest-free") + "</section>";
    html += '<nav class="tabs" role="tablist" aria-label="Books">' + ORDER.map(function (k) { return '<button role="tab" data-tab="' + k + '" aria-selected="' + (k === tab) + '">' + esc(BOOKS[k].label) + "</button>"; }).join("") + "</nav>";
    html += renderBook(tab);
    html += '<p class="foot">This ledger is the record promised in Article III.4 of the Constitution of Eleventh Thesis. Every entry is a commit to <a href="ledger.json">ledger.json</a>' +
      (repo ? ' in the <a href="' + esc(repo) + '">public repository</a>, so the full history of the books can be audited' : "") +
      ". Figures are in ISK. Questions go to the corporation channel or to the CEO by in-game mail.</p>";
    root.innerHTML = html;
  }

  root.addEventListener("click", function (ev) {
    var b = ev.target.closest("button[data-tab]"); if (!b) return;
    tab = b.dataset.tab;
    try { localStorage.setItem("eleve-tab", tab); } catch (e) {}
    try { history.replaceState(null, "", "#" + tab); } catch (e) {}
    render();
  });

  fetch("ledger.json", { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (data) { D = data; normalize(); render(); })
    .catch(function (e) {
      root.querySelector(".meta").textContent = "The ledger data couldn't be loaded (" + e.message + "). Try reloading the page.";
    });
})();
