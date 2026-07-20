// FxScalper — personal copy-trading terminal
// All data is stored locally (localStorage). No network calls, no broker execution —
// this is the confirmation-first UI shell described in the README's development plan.

const SYMBOLS = ["EURUSD", "XAUUSD", "GBPJPY", "US30", "BTCUSD"];
const BASE_PRICES = { EURUSD: 1.0862, XAUUSD: 2412.4, GBPJPY: 198.32, US30: 39840, BTCUSD: 63500 };
const BROKER_DEFS = [
  { id: "mt5", name: "MetaTrader 5", kind: "terminal" },
  { id: "mt4", name: "MetaTrader 4", kind: "terminal" },
  { id: "exness", name: "Exness", kind: "broker" },
  { id: "hfm", name: "HFM", kind: "broker" },
  { id: "tradingview", name: "TradingView", kind: "chart" },
];

// ---------- State (persisted to localStorage) ----------

let signals = load("fx_signals", []);
let history = load("fx_history", []);
let brokers = load("fx_brokers", Object.fromEntries(BROKER_DEFS.map(b => [b.id, b.id === "tradingview"])));
let nextId = load("fx_nextid", 1);
let prices = SYMBOLS.map(s => ({ symbol: s, price: BASE_PRICES[s], up: true }));

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) { return fallback; }
}
function save() {
  localStorage.setItem("fx_signals", JSON.stringify(signals));
  localStorage.setItem("fx_history", JSON.stringify(history));
  localStorage.setItem("fx_brokers", JSON.stringify(brokers));
  localStorage.setItem("fx_nextid", JSON.stringify(nextId));
}

// ---------- Explanation engine (rule-based) ----------

function explain(sig) {
  const rsiWord = sig.rsi > 70 ? "overbought" : sig.rsi < 30 ? "oversold" : "neutral";
  const trendWord = sig.trend === "up" ? "an uptrend" : sig.trend === "down" ? "a downtrend" : "a ranging market";
  const levelWord = sig.direction === "BUY" ? "support" : "resistance";
  const verb = sig.direction === "BUY" ? "Buying" : "Selling";
  return `${verb} ${sig.symbol} near ${levelWord} at ${sig.entry}, with RSI ${sig.rsi} (${rsiWord}) confirming ${trendWord}.`;
}

function randPrice(sym) {
  const base = BASE_PRICES[sym];
  const digits = (sym === "US30" || sym === "BTCUSD") ? 1 : 4;
  return +(base + (Math.random() - 0.5) * base * 0.002).toFixed(digits);
}

function genSignal() {
  const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const direction = Math.random() > 0.5 ? "BUY" : "SELL";
  const entry = randPrice(symbol);
  const pip = symbol === "XAUUSD" ? 3 : symbol === "US30" ? 40 : symbol === "BTCUSD" ? 200 : 0.003;
  const sl = +(direction === "BUY" ? entry - pip * 3 : entry + pip * 3).toFixed(4);
  const tp = +(direction === "BUY" ? entry + pip * 5 : entry - pip * 5).toFixed(4);
  const rsi = Math.floor(20 + Math.random() * 60);
  const trend = ["up", "down", "range"][Math.floor(Math.random() * 3)];
  const source = ["Telegram: FX Alpha Calls", "TradingView Alert", "Manual Entry"][Math.floor(Math.random() * 3)];
  const sig = { id: nextId++, symbol, direction, entry, sl, tp, rsi, trend, source, time: Date.now(), status: "pending" };
  sig.explanation = explain(sig);
  return sig;
}

// ---------- Rendering ----------

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

function renderTicker() {
  const el = document.getElementById("ticker");
  const items = [...prices, ...prices];
  el.innerHTML = items.map(p =>
    `<span><span class="sym">${p.symbol}</span><span class="${p.up ? "up" : "down"} mono">${p.price}</span></span>`
  ).join("");
}

function renderConnPill() {
  const count = Object.values(brokers).filter(Boolean).length;
  document.getElementById("connCount").textContent = `${count}/${BROKER_DEFS.length} linked`;
  document.getElementById("connDot").className = "dot" + (count > 0 ? " on" : "");
  document.getElementById("noBrokerNotice").style.display = count === 0 && signals.length > 0 ? "block" : "none";
}

function renderSignals() {
  const list = document.getElementById("signalList");
  const empty = document.getElementById("emptySignals");
  empty.style.display = signals.length === 0 ? "block" : "none";
  list.innerHTML = signals.map(s => {
    const isBuy = s.direction === "BUY";
    return `
    <div class="card">
      <div class="card-top">
        <div class="card-left">
          <span class="dir-icon ${isBuy ? "buy" : "sell"}">${isBuy ? "↑" : "↓"}</span>
          <span class="symbol">${esc(s.symbol)}</span>
          <span class="badge ${isBuy ? "buy" : "sell"}">${s.direction}</span>
        </div>
        <span class="source-tag">${esc(s.source)}</span>
      </div>
      <p class="explanation">${esc(s.explanation)}</p>
      <div class="levels">
        <span>entry <b class="mono">${s.entry}</b></span>
        <span class="sl">sl <b class="mono">${s.sl}</b></span>
        <span class="tp">tp <b class="mono">${s.tp}</b></span>
      </div>
      <div class="actions">
        <button class="reject" data-action="reject" data-id="${s.id}">✕ Reject</button>
        <button class="approve" data-action="execute" data-id="${s.id}">✓ Execute</button>
      </div>
    </div>`;
  }).join("");
  renderConnPill();
}

function renderBrokers() {
  const list = document.getElementById("brokerList");
  list.innerHTML = BROKER_DEFS.map(b => {
    const on = brokers[b.id];
    return `
    <div class="broker-row">
      <div class="broker-info">
        <span class="dot ${on ? "on" : ""}"></span>
        <div>
          <p class="broker-name">${b.name}</p>
          <p class="broker-kind">${b.kind}</p>
        </div>
      </div>
      <button class="conn-btn ${on ? "" : "connect"}" data-broker="${b.id}">
        ${on ? "Disconnect" : "Connect"}
      </button>
    </div>`;
  }).join("");
}

function renderHistory() {
  const list = document.getElementById("historyList");
  const empty = document.getElementById("emptyHistory");
  empty.style.display = history.length === 0 ? "block" : "none";
  list.innerHTML = history.map(h => `
    <div class="hist-row">
      <div class="hist-left">
        <span class="status-dot ${h.status}"></span>
        <div>
          <p class="hist-sym">${esc(h.symbol)} <span style="color:${h.direction === "BUY" ? "var(--forest)" : "var(--rose)"}">${h.direction}</span></p>
          <p class="hist-time">${new Date(h.resolvedAt).toLocaleTimeString()}</p>
        </div>
      </div>
      <span class="hist-status ${h.status}">${h.status}</span>
    </div>`).join("");
}

// ---------- Actions ----------

function simulateSignal() {
  signals.unshift(genSignal());
  save();
  renderSignals();
}

function resolveSignal(id, action) {
  const idx = signals.findIndex(s => s.id === id);
  if (idx === -1) return;
  const [sig] = signals.splice(idx, 1);
  history.unshift({ ...sig, status: action, resolvedAt: Date.now() });
  save();
  renderSignals();
  renderHistory();
}

function toggleBroker(id) {
  brokers[id] = !brokers[id];
  save();
  renderBrokers();
  renderSignals();
}

// ---------- Tabs ----------

function switchTab(name) {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.id === "tab-" + name));
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
}

// ---------- Event wiring ----------

document.getElementById("simulateBtn").addEventListener("click", simulateSignal);

document.getElementById("signalList").addEventListener("click", e => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  resolveSignal(Number(btn.dataset.id), btn.dataset.action);
});

document.getElementById("brokerList").addEventListener("click", e => {
  const btn = e.target.closest("button[data-broker]");
  if (!btn) return;
  toggleBroker(btn.dataset.broker);
});

document.querySelectorAll("nav button").forEach(b => {
  b.addEventListener("click", () => switchTab(b.dataset.tab));
});

document.getElementById("newSignalForm").addEventListener("submit", e => {
  e.preventDefault();
  const sig = {
    id: nextId++,
    symbol: document.getElementById("f-symbol").value,
    direction: document.getElementById("f-direction").value,
    entry: parseFloat(document.getElementById("f-entry").value),
    sl: parseFloat(document.getElementById("f-sl").value),
    tp: parseFloat(document.getElementById("f-tp").value),
    rsi: parseInt(document.getElementById("f-rsi").value, 10) || 50,
    trend: document.getElementById("f-trend").value,
    source: document.getElementById("f-source").value || "Manual Entry",
    time: Date.now(),
    status: "pending",
  };
  sig.explanation = explain(sig);
  signals.unshift(sig);
  save();
  renderSignals();
  e.target.reset();
  document.getElementById("f-source").value = "Manual Entry";
  switchTab("signals");
});

// ---------- Live ticker simulation ----------

setInterval(() => {
  prices = prices.map(p => {
    const np = randPrice(p.symbol);
    return { ...p, price: np, up: np >= p.price };
  });
  renderTicker();
}, 2200);

// ---------- Init ----------

renderTicker();
renderBrokers();
renderSignals();
renderHistory();

// ---------- Register service worker (PWA) ----------

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
