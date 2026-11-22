const fmt = (n, d = 4) => (n == null ? "unpriced" : "$" + n.toFixed(d));
const num = s => parseFloat(String(s).replace(/[$,\s]/g, ""));

function parseCSV(t) {
  const rows = []; let r = [], c = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { r.push(c); c = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && t[i + 1] === "\n") i++; r.push(c); rows.push(r); r = []; c = ""; }
    else c += ch;
  }
  if (c || r.length) { r.push(c); rows.push(r); }
  const [h, ...b] = rows.filter(x => x.some(v => v.trim()));
  return b.map(x => Object.fromEntries(h.map((k, i) => [k.trim().toLowerCase(), (x[i] || "").trim()])));
}

// Each sheet tab is fetched once per page, even when the page and the events panel both ask for it
const tableCache = {};
function table(name) {
  return tableCache[name] ||= (async () => {
    const url = (window.SHEETS || {})[name] || `data/${name}.csv`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`the "${name}" sheet returned ${res.status}`);
    return parseCSV(await res.text());
  })();
}

async function get(name) {
  const rows = await table(name);
  if (name === "events") return { events: rows.filter(r => r.event) };
  if (name === "values")
    return { values: rows.filter(r => r.item).map(r => ({ item: r.item, qty: num(r.qty), usd: num(r.usd), source: r.source, superseded: /^(true|yes|1|x)$/i.test(r.superseded) })) };
  if (name === "featured") return { featured: rows.filter(r => r.title) };
  const groups = new Map();
  const key = name === "shops" ? "shop" : "pack";
  for (const r of rows.filter(r => r[key] && r.item)) {
    if (!groups.has(r[key])) groups.set(r[key], { name: r[key], price: num(r.price), limit: r.limit, event: r.event || "", recurring: (r.recurring || r.reoccuring || r.reoccurring || "").trim(), list: [] });
    const q = num(r.qty);
    groups.get(r[key]).list.push(name === "shops" ? { item: r.item, tokens: num(r.tokens), qty: q > 0 ? q : 1, tier: r.tier || "" } : { item: r.item, qty: q });
  }
  return name === "shops"
    ? { shops: [...groups.values()].map(g => ({ name: g.name, event: g.event, recurring: g.recurring, items: g.list })) }
    : { popups: [...groups.values()].map(g => ({ name: g.name, price: g.price, limit: g.limit, event: g.event, recurring: g.recurring, contents: g.list })) };
}

window.addEventListener("unhandledrejection", e =>
  document.querySelector("main").insertAdjacentHTML("afterbegin",
    `<p class="bad">Couldn't load the data: ${e.reason.message}. Check the links in config.js.</p>`));

async function unitValues() {
  const { values } = await get("values");
  const m = {};
  for (const v of values) if (!v.superseded) m[v.item] = { unit: v.usd / v.qty, source: v.source };
  return m;
}

// Item pictures in images/: item name as written in the sheets (any case) -> file name without .png
const ITEM_IMAGES = {
  "advanced taming mark": "advancedtaming",
  "common taming mark": "commontaming",
  "1h const. speedup": "constructionspeed",
  "forgehammer": "forgehammer",
  "gems": "gems",
  "mythic general hero shard": "generalmythic",
  "promotion medallion": "medallion",
  "mithril": "mithril",
  "1h training speed": "trainingspeed",
  "5m training speed": "trainingspeed",
  "truegold": "truegold",
  "truegold dust": "truegolddust",
  "charm guide": "charmguide",
  "charm design": "charmdesign",
  "artisans vision": "artisans",
  "gilded threads": "threads",
  "satin": "satin",
  "mystery badge": "mysterybadge",
  "masters manuscript": "mastermanuscript",
  "elite spices": "elitespice",
  "silver goblet": "goblet",
  "general master emblem": "generalmasteremblem",
  "pet adv. mats chest": "petadvmatchest",
  "lucky hero gear chest": "luckyherochest",
  "custom mythic hero gear chest": "custommythicherochest",
  "1hr general speed": "generalspeed",
  "3hr general speed": "generalspeed",
  "gold": "gold",
  "governor gear mats chest": "govmatschest",
  "growth manual": "growthmanual",
  "1h learning speed": "learningspeed",
  "nutrient potion": "nutrientpotion",
  "pet food": "petfood",
  "1h research speed": "researchspeed",
  "100 xp enhancement": "xpenhancement",
  "gen 5 custom hero widget": "gen5widget"
};
// Item name with its picture in front; items without one get an empty slot so names stay lined up
function itemName(name) {
  const f = ITEM_IMAGES[String(name).trim().toLowerCase()];
  return `<span class="item-name">${f ? `<img class="item-img" src="images/${f}.png" alt="" width="28" height="28" loading="lazy">` : `<span class="item-img"></span>`}<span>${esc(name)}</span></span>`;
}

const ICONS = {
  list: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  bag: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8a3 3 0 016 0"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M12 9v11M4 14h16M12 9C8 9 8 4 10.5 5S12 9 12 9zm0 0c4 0 4-5 1.5-4S12 9 12 9z"/>',
  bars: '<path d="M6 20V11M12 20V5M18 20v-6"/>',
  gem: '<path d="M12 3l8 6-8 12L4 9z"/><path d="M4 9h16"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h1M12 12h1M16 12h0M8 16h1M12 16h1M16 16h0"/>',
  link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 013-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 01-3 3H3"/>',
  star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 8.5h0M15.5 8.5h0M12 12h0M8.5 15.5h0M15.5 15.5h0" stroke-width="2.6"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  home: '<path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z"/>',
  go: '<path d="M5 12h14M13 6l6 6-6 6"/>'
};
const icon = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;
const hue = s => "c" + ([...String(s)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % 5);

function header(active) {
  document.body.classList.add("t3");
  const pages = [
    ["index.html", "Dashboard", "home", "Track what Kingshot packs, shops and events are really worth."],
    ["event.html", "Seasonal events", "star", "Holiday and limited-time events, each with its currency shop and pop-up packs."],
    ["recurring.html", "Recurring events", "repeat", "Events that come back on a rotation, with their currency shops ranked by dollars of value per token and their pop-up packs."],
    ["shops.html", "Permanent event shops", "bag", "Currency shops that are always available, ranked by dollars of value per token."],
    ["popups.html", "Pop-up packs", "gift", "How special event packs compare with the same contents at regular prices."],
    ["build.html", "Pack builder", "calc", "Type in a pack's items and price to see how it compares with regular packs."],
    ["masterlist.html", "Masterlist", "list", "What every upgrade item is worth in dollars, based on regular packs."],
    ["others.html", "Other Pages by Mira", "link", "More Kingshot tools I built.", true]
  ];
  const cur = pages.find(p => p[0] === active);
  const logo = `<svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3l11 8-11 18L5 11z" fill="#f0553f"/><path d="M5 11h22L16 29z" fill="#ffb43a"/><path d="M16 3l5 8H11z" fill="#4fbfd8"/></svg>`;
  document.body.insertAdjacentHTML("afterbegin",
    `<aside class="side"><div class="brand">${logo}<span>Mira’s KS<small>Value Guide</small></span></div>
    <nav aria-label="Pages">${pages.filter(p => !p[4]).map(([h, t, i]) => `<a href="${h}" title="${t}"${h === active ? " aria-current=page" : ""}>${icon(i)}${t}</a>`).join("")}</nav>
    <p class="tagline">built on #1584 pack data</p></aside>`);
  document.querySelector("main").insertAdjacentHTML("afterbegin",
    `<p class="eyebrow">Mira’s KS Value Guide</p><h1>${cur[1]}</h1><p class="sub">${cur[3]}</p><div class="stats" id="stats"></div>`);
  document.querySelector("main").insertAdjacentHTML("beforeend", `<footer class="credits">made with love by <a href="https://mirakingshot.github.io/">Mira [221330479]</a></footer>`);
  eventBell();
}

// list: [[label, value, iconKey, tone("" | "pink" | "peach")]]
function stats(list) {
  document.getElementById("stats").innerHTML = list.map(([l, v, i, t]) =>
    `<div class="stat ${t || ""}"><span class="tile">${icon(i)}</span><div><p>${l}</p><strong>${v}</strong></div></div>`).join("");
}

// cols: [{key, label, text:(row)=>html, num:true}]; sortable, searchable on col 0
function render(el, cols, rows, search, head, init, expand) {
  let key = init ? init[0] : cols[0].key, dir = init ? init[1] : 1, q = "";
  const open = new Set();
  const val = (r, c) => (c.sort ? c.sort(r) : r[c.key]);
  function draw() {
    const c = cols.find(c => c.key === key);
    const list = rows.filter(r => String(r[cols[0].key]).toLowerCase().includes(q))
      .sort((a, b) => {
        const x = val(a, c), y = val(b, c);
        if (x == null) return 1; if (y == null) return -1;
        return (x > y ? 1 : x < y ? -1 : 0) * dir;
      });
    el.querySelector("tbody").innerHTML = list.map(r => {
      const o = expand && open.has(r);
      const cells = cols.map((c, i) => `<td data-label="${c.label}"${c.hero ? ' class="hero"' : c.wide ? ' class="wide"' : ""}>${i === 0 && expand ? `<button class="chev" aria-expanded="${!!o}" aria-label="Show breakdown"></button>` : ""}${c.text(r)}</td>`).join("");
      const cls = [expand ? "exp" : "", r.rowCls || ""].filter(Boolean).join(" ");
      return `<tr${cls ? ` class="${cls}"` : ""}${expand ? ` data-i="${rows.indexOf(r)}"` : ""}>${cells}</tr>` +
        (o ? `<tr class="detail"><td colspan="${cols.length}">${expand(r)}</td></tr>` : "");
    }).join("");
    el.querySelectorAll("th button").forEach(b => {
      const on = b.dataset.k === key;
      b.querySelector(".arrow").textContent = on ? (dir === 1 ? "▲" : "▼") : "↕";
      b.classList.toggle("on", on);
      b.parentElement.setAttribute("aria-sort", on ? (dir === 1 ? "ascending" : "descending") : "none");
    });
  }
  const input = search ? `<input type="search" placeholder="Search items" aria-label="Search items">` : "";
  const tbl = `<div class="wrap"><table class="rt${cols.some(c => c.hero) ? " has-hero" : ""}"><thead><tr>${cols.map(c => `<th><button data-k="${c.key}">${c.label}<span class="arrow" aria-hidden="true"></span></button></th>`).join("")}</tr></thead><tbody></tbody></table></div>`;
  el.innerHTML = head
    ? `<div class="card"><div class="card-head"><div><h2>${head[0]}</h2><p>${head[1]}</p></div>${input}</div>${tbl}</div>`
    : input + tbl;
  el.addEventListener("click", e => {
    const k = e.target.closest("button[data-k]")?.dataset.k;
    if (k) { dir = k === key ? -dir : 1; key = k; draw(); return; }
    const tr = expand && e.target.closest("tr.exp");
    if (tr) {
      const i = tr.dataset.i, r = rows[+i];
      open.has(r) ? open.delete(r) : open.add(r);
      draw();
      el.querySelector(`tr[data-i="${i}"] .chev`)?.focus();
    }
  });
  if (search) el.querySelector("input").addEventListener("input", e => { q = e.target.value.toLowerCase(); draw(); });
  draw();
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function scorePacks(m, popups) {
  return popups.map(p => {
    let worth = 0;
    const lines = p.contents.map(c => {
      const u = m[c.item] ? m[c.item].unit : null;
      const w = u == null ? null : u * c.qty;
      if (w != null) worth += w;
      return { item: c.item, qty: c.qty, unit: u, worth: w };
    });
    return { name: p.name, sample: p.sample, price: p.price, limit: p.limit, event: p.event, recurring: p.recurring || "", worth, ratio: worth / p.price, lines, missing: lines.filter(l => l.worth == null).map(l => l.item) };
  });
}
const verdict = r => r.ratio >= 1.25 ? ["Great", "green"] : r.ratio >= 0.9 ? ["Fair", "amber"] : ["Poor", "rose"];

function bigLink(href, ic, title, desc, badge, cls = "", pillCls = "amber") {
  const url = /^\s*javascript:/i.test(href) ? "#" : href;
  const ext = /^https?:/i.test(url);
  return `<a class="big-link ${cls}" href="${esc(url)}"${ext ? ' target="_blank" rel="noopener"' : ""}><span class="tile">${icon(ic)}</span>` +
    `<strong>${esc(title)}</strong><span class="desc">${esc(desc || "")}</span>` +
    `<span class="go">${badge ? `<span class="pill ${pillCls}">${esc(badge)}</span>` : "<span></span>"}<span class="go-arrow">${icon("go")}</span></span></a>`;
}

function packDetail(r) {
  const unpriced = '<span class="pill amber">unpriced</span>';
  const body = r.lines.map(l => {
    const share = l.worth != null && r.worth ? l.worth / r.worth : null;
    return `<tr><td>${itemName(l.item)}</td><td>${l.qty.toLocaleString()}</td><td>${l.unit == null ? unpriced : fmt(l.unit)}</td>` +
      `<td>${l.worth == null ? unpriced : `<span class="strong">${fmt(l.worth, 2)}</span>`}</td>` +
      `<td>${share == null ? '<span class="dim">-</span>' : Math.round(share * 100) + `%<span class="meter" style="width:${Math.round(share * 60)}px"></span>`}</td></tr>`;
  }).join("");
  const diff = r.worth - r.price;
  const miss = r.missing.length
    ? `<p class="dim">${r.missing.length === 1 ? "1 item has" : r.missing.length + " items have"} no pack price yet (${esc(r.missing.join(", "))}), so the total is partial and the real ratio is higher.</p>` : "";
  return `<div class="breakdown"><p class="dim">${r.limit ? "Limit " + esc(r.limit) + ". " : ""}Every item is valued at what regular packs charge for it.</p>` +
    `<table><thead><tr><th>Item</th><th>Qty</th><th>$ each</th><th>Worth</th><th>Share of worth</th></tr></thead><tbody>${body}</tbody>` +
    `<tfoot><tr><td>Total at regular pack rates</td><td></td><td></td><td>${fmt(r.worth, 2)}</td><td></td></tr>` +
    `<tr><td>Pack price</td><td></td><td></td><td>${fmt(r.price, 2)}</td><td></td></tr>` +
    `<tr><td>Difference</td><td></td><td></td><td><span class="${diff >= 0 ? "pos" : "neg"}">${diff >= 0 ? "+" : "-"}${fmt(Math.abs(diff), 2)}</span></td><td>${r.ratio.toFixed(2)}x</td></tr></tfoot></table>${miss}</div>`;
}

const packCols = [
  { key: "name", label: "Pack", text: r => esc(r.name) + (r.sample ? '<span class="tag">sample</span>' : "") },
  { key: "price", label: "Price", text: r => fmt(r.price, 2) },
  { key: "worth", label: "Worth at pack rates", text: r => fmt(r.worth, 2) + (r.missing.length ? ` <span class="dim" title="Unpriced: ${esc(r.missing.join(", "))}">(partial)</span>` : "") },
  { key: "ratio", label: "Ratio", text: r => `<span class="strong">${r.ratio.toFixed(2)}x</span>` },
  { key: "v", label: "Verdict", hero: true, sort: r => r.ratio, text: r => { const [t, c] = verdict(r); return `<span class="pill ${c}">${t}</span>`; } }
];

function shopView(m, s) {
  const rows = s.items.map(x => {
    const u = m[x.item] ? m[x.item].unit : null;
    const qty = x.qty || 1, value = u == null ? null : u * qty;
    return { item: x.item, tier: x.tier, tokens: x.tokens, qty, unit: u, value, perToken: value == null ? null : value / x.tokens };
  });
  const best = Math.max(0, ...rows.map(r => r.perToken || 0));
  rows.forEach(r => (r.pct = r.perToken == null ? null : r.perToken / best));
  // Rank by value (ties share a rank); top 3 are highlighted, under 50% of best is faded
  const ranked = rows.filter(r => r.perToken != null).sort((a, b) => b.perToken - a.perToken);
  ranked.forEach((r, i) => {
    r.rank = i && r.perToken === ranked[i - 1].perToken ? ranked[i - 1].rank : i + 1;
    r.rowCls = r.rank <= 3 ? "top" : r.pct < 0.5 ? "low" : "";
  });
  return { name: s.name, event: s.event, rows, best, unpriced: rows.filter(r => r.perToken == null).length };
}

// The Qty column only appears when some item sells more than 1 per purchase; Worth is then the value of the whole purchase
// Pill colour per tier. A tier named after a colour (Gold, Purple, Blue...) gets that colour;
// any other tier gets the next colour not already taken, so tiers in one shop never share a colour.
const TIER_HUES = [[/gold|orange|yellow|bronze/i, "c3"], [/purple|violet|lavender/i, "purple"], [/blue/i, "c1"], [/green/i, "c4"], [/pink|red|rose/i, "c2"], [/silver|grey|gray|white/i, "grey"]];
function tierColors(order) {
  const map = {}, used = new Set();
  order.forEach(t => {
    const hit = TIER_HUES.find(([re, c]) => re.test(t) && !used.has(c));
    if (hit) { map[t] = hit[1]; used.add(hit[1]); }
  });
  const spare = ["purple", "c1", "c3", "c4", "c2", "grey"];
  order.forEach(t => {
    if (map[t]) return;
    const c = spare.find(c => !used.has(c)) || spare[order.indexOf(t) % spare.length];
    map[t] = c; used.add(c);
  });
  return map;
}

// tierOrder (optional): array of tier names; adds a Tier column that sorts in sheet order
function shopCols(rows, tierOrder) {
  const multi = rows.some(r => r.qty !== 1);
  const tc = tierOrder ? tierColors(tierOrder) : {};
  return [
    { key: "item", label: "Item", text: r => `<span class="ranked"><span class="rank${r.rank ? "" : " none"}" aria-label="${r.rank ? "Rank " + r.rank : "Unranked"}">${r.rank ? "#" + r.rank : "–"}</span>${itemName(r.item)}</span>` },
    ...(tierOrder ? [{ key: "tier", label: "Tier", sort: r => tierOrder.indexOf(r.tier), text: r => `<span class="pill ${tc[r.tier]}">${esc(r.tier || "Other")}</span>` }] : []),
    { key: "tokens", label: "Tokens", text: r => r.tokens.toLocaleString() },
    ...(multi ? [{ key: "qty", label: "Qty", text: r => r.qty.toLocaleString() }] : []),
    multi ? { key: "value", label: "Worth", text: r => fmt(r.value) } : { key: "unit", label: "Baseline", text: r => fmt(r.unit) },
    { key: "perToken", label: "$ per token", text: r => `<span class="strong">${fmt(r.perToken, 6)}</span>` },
    { key: "pct", label: "% of best", hero: true, text: r => r.pct == null ? `<span class="pill amber">unpriced</span>` : `${Math.round(r.pct * 100)}%<span class="meter" style="width:${Math.round(r.pct * 60)}px"></span>` }
  ];
}

// Splits a shop's items by tier, in the order tiers first appear in the sheet. A shop with no tiers is one group with tier "".
function shopTiers(s) {
  const g = new Map();
  for (const x of s.items) {
    if (!g.has(x.tier)) g.set(x.tier, []);
    g.get(x.tier).push(x);
  }
  return [...g].map(([tier, items]) => ({ tier, items }));
}

// Renders a shop into el: one table, or (for a shop with tiers) a toggle between a separate table per tier,
// ranked within each tier, and one table ranking every tier's items together. The choice is remembered per viewer.
function renderShop(el, m, s) {
  const groups = shopTiers(s);
  const views = groups.map(g => ({ tier: g.tier, ...shopView(m, { ...s, items: g.items }) }));
  const summary = { name: s.name, tiers: groups.filter(g => g.tier).length, best: Math.max(0, ...views.map(v => v.best)), unpriced: views.reduce((a, v) => a + v.unpriced, 0) };
  const table = (box, v, tierOrder) => render(box, shopCols(v.rows, tierOrder), v.rows, false, null, ["perToken", -1]);
  if (groups.length === 1 && !groups[0].tier) { table(el, views[0]); return summary; }

  const all = shopView(m, s), order = groups.map(g => g.tier);
  let mode = "split";
  try { if (localStorage.getItem("tierMode") === "all") mode = "all"; } catch (e) {}
  el.innerHTML = `<div class="seg" role="group" aria-label="How to rank tiers"><button type="button" data-mode="split">Keep tiers separate</button><button type="button" data-mode="all">Rank all tiers together</button></div><div class="tier-body"></div>`;
  const body = el.querySelector(".tier-body");
  const draw = () => {
    el.querySelectorAll(".seg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
    if (mode === "all") {
      // A fresh element each time, since render() adds its click handler to the element it is given
      body.innerHTML = `<div class="tier-table"></div>`;
      table(body.firstChild, all, order);
    } else {
      body.innerHTML = views.map(v => `<section class="tier"><div class="tier-head"><h3>${esc(v.tier || "Other")}</h3>${v.best ? `<span class="pill">Best ${fmt(v.best, 6)} per token</span>` : ""}</div><div class="tier-table"></div></section>`).join("");
      body.querySelectorAll(".tier-table").forEach((box, i) => table(box, views[i]));
    }
  };
  el.querySelector(".seg").addEventListener("click", e => {
    const b = e.target.closest("button[data-mode]");
    if (!b || b.dataset.mode === mode) return;
    mode = b.dataset.mode;
    try { localStorage.setItem("tierMode", mode); } catch (e) {}
    draw();
  });
  draw();
  return summary;
}

// Event dates follow the game's UTC reset: a start date begins at 00:00 UTC, an end date runs until 23:59 UTC
function parseDate(v, endOfDay) {
  if (!v) return null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v.trim());
  const p = iso ? null : new Date(v);
  if (p && isNaN(p)) return null;
  const [y, m, day] = iso ? [+iso[1], +iso[2] - 1, +iso[3]] : [p.getFullYear(), p.getMonth(), p.getDate()];
  return new Date(endOfDay ? Date.UTC(y, m, day, 23, 59, 59, 999) : Date.UTC(y, m, day));
}
const shortDate = d => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

// meta: a row from the events tab (or undefined). Returns {state: active|upcoming|past, label, start, end}
function eventStatus(meta) {
  const start = meta ? parseDate(meta.start) : null, end = meta ? parseDate(meta.end, true) : null;
  const now = new Date();
  if (end && now > end) return { state: "past", label: "Ended " + shortDate(end), start, end };
  if (start && now < start) return { state: "upcoming", label: "Starts " + shortDate(start), start, end };
  return { state: "active", label: end ? "Active until " + shortDate(end) : "Active", start, end };
}
const stateRank = { active: 0, upcoming: 1, past: 2 };

// Top bar calendar button: badge with the number of active events, popup listing them
function eventBell() {
  const main = document.querySelector("main");
  main.insertAdjacentHTML("afterbegin",
    `<div class="topbar"><span class="kd-chip">#1584 · ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).toUpperCase()} UTC</span>
      <div class="bell-wrap"><button type="button" class="bell" aria-haspopup="dialog" aria-expanded="false" aria-controls="evpop" aria-label="Active events">${icon("cal")}<span class="badge" hidden></span></button>
      <div class="evpop" id="evpop" role="dialog" aria-label="Active events" hidden><div class="evpop-head"><strong>Active events</strong><button type="button" class="evpop-x" aria-label="Close">${icon("close")}</button></div><div class="evpop-body"><p class="dim">Loading…</p></div></div></div></div>`);
  const btn = main.querySelector(".bell"), pop = main.querySelector(".evpop"), badge = btn.querySelector(".badge");
  const setOpen = o => { pop.hidden = !o; btn.setAttribute("aria-expanded", String(o)); if (o) pop.querySelector(".evpop-x").focus(); };
  btn.addEventListener("click", e => { e.stopPropagation(); setOpen(pop.hidden); });
  pop.querySelector(".evpop-x").addEventListener("click", () => { setOpen(false); btn.focus(); });
  document.addEventListener("click", e => { if (!pop.hidden && !pop.contains(e.target)) setOpen(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !pop.hidden) { setOpen(false); btn.focus(); } });

  Promise.all([get("events").catch(() => ({ events: [] })), get("shops").catch(() => ({ shops: [] })), get("popups").catch(() => ({ popups: [] }))])
  .then(([{ events }, { shops }, { popups }]) => {
    const k = s => (s || "").trim().toLowerCase();
    const pageFor = name => {
      const n = k(name), all = [...shops, ...popups];
      if (all.some(x => k(x.recurring) === n)) return "recurring.html?e=" + encodeURIComponent(name.trim());
      if (all.some(x => k(x.event) === n)) return "event.html?e=" + encodeURIComponent(name.trim());
      return "";
    };
    const list = events.map(e => ({ ...e, st: eventStatus(e), page: pageFor(e.event) })).filter(e => e.st.state !== "past");
    const now = list.filter(e => e.st.state === "active").sort((a, b) => (a.st.end || Infinity) - (b.st.end || Infinity));
    const soon = list.filter(e => e.st.state === "upcoming").sort((a, b) => a.st.start - b.st.start);
    if (now.length) { badge.textContent = now.length; badge.hidden = false; }
    const row = e => `<li class="ev ${e.st.state}"><span class="ev-dot"></span><div class="ev-main"><strong>${esc(e.event)}</strong><span class="dim">${esc(e.st.label)}</span>
      <span class="ev-links">${e.page ? `<a href="${e.page}">Values</a>` : ""}${e.simulator ? `<a href="${esc(e.simulator)}" target="_blank" rel="noopener">Simulator</a>` : ""}</span></div></li>`;
    pop.querySelector(".evpop-body").innerHTML =
      (now.length ? `<ul class="evlist">${now.map(row).join("")}</ul>` : `<p class="dim">No events running right now.</p>`) +
      (soon.length ? `<p class="ev-sub">Coming up</p><ul class="evlist">${soon.map(row).join("")}</ul>` : "");
  });
}
