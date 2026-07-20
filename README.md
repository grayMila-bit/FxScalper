# FxScalper

A personal copy-trading terminal — a plain HTML/CSS/JS Progressive Web App (PWA) that runs
in the browser, installs to your Android home screen, and works fully offline.

This is the **manual-first version**: it displays trade signals, generates a one-sentence
plain-English explanation for each one, and lets you approve/reject them. It does **not**
place real trades yet — approving a signal just logs it. You still execute the trade
yourself in MT4/MT5. See "Next steps" below for how to wire up real broker automation.

## What's included

```
fxscalper/
├── index.html          → app shell, all 5 tabs (Signals, New, Brokers, History, Settings)
├── css/style.css        → navy / forest-green / sky-blue theme
├── js/app.js             → all app logic (signal generation, explanations, storage)
├── manifest.json         → PWA install config
├── service-worker.js     → offline caching
├── icons/
│   ├── logo.svg          → source logo (F + T monogram with candlestick)
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── apple-touch-icon.png
│   └── favicon-32.png
└── README.md
```

Data (signals, history, broker toggle states) is stored in your phone's browser via
`localStorage` — nothing leaves your device, there's no backend, and nothing is sent
to any server.

## Publish it on GitHub Pages (free)

1. Create a new GitHub repository (e.g. `fxscalper`).
2. Upload every file in this folder, keeping the same structure (drag-and-drop on
   github.com works, or `git init && git add . && git commit -m "init" && git push`).
3. In the repo: **Settings → Pages → Source → Deploy from a branch → `main` / root**.
4. Wait ~1 minute, then your app is live at:
   `https://<your-username>.github.io/fxscalper/`
5. Open that URL on your Android phone in Chrome → menu (⋮) → **Add to Home Screen**.
   It now behaves like an installed app, works offline, and uses the FxScalper icon.

## Using the app

- **Signals tab** — tap "+ simulate" to preview how a signal card looks, or approve/reject
  real ones you've entered.
- **New tab** — manually log a signal (symbol, direction, entry/SL/TP, RSI, trend, source).
  The one-sentence explanation is generated automatically from these fields.
- **Brokers tab** — toggle connection status for MT4, MT5, Exness, HFM, TradingView.
  These are status indicators only in this version — see below for real connectivity.
- **History tab** — everything you've approved or rejected.
- **Settings tab** — current config summary.

## Next steps: real signal feeds & broker execution

This version is intentionally backend-free so it's free to host and simple to publish.
To make it fully automated, you'd add:

1. **Real signal ingestion** — a small backend (Node/Python) that reads a Telegram
   channel via the Telegram Bot API, or receives TradingView webhook alerts, parses
   them into the same signal format used here, and pushes them to the app (e.g. via a
   small API the app polls, or WebSocket).
2. **Broker execution** — MT4/MT5 don't expose a public REST API. The standard approach
   is an Expert Advisor (EA) running on the MT4/5 terminal (hosted on a small VPS, since
   MT4/5 terminals are Windows-native) that exposes a local HTTP endpoint your backend
   calls to place orders. Exness and HFM accounts are accessed the same way, through
   their MT4/5 terminals — not a broker-specific API.
3. **Swap localStorage for a real database** once there's a backend, so signal/trade
   history isn't tied to a single device/browser.

If you want, ask for the Node.js signal-parser + MT4/5 EA bridge starter code next —
it plugs into the same explanation logic already in `js/app.js`.

## Customizing

- **Colors**: edit the CSS variables at the top of `css/style.css` (`--navy`, `--forest`,
  `--sky`, etc.) — everything in the app references these.
- **Logo**: `icons/logo.svg` is the editable source; regenerate PNGs from it if you tweak it.
- **Symbols/instruments**: edit the `SYMBOLS` and `BASE_PRICES` objects at the top of `js/app.js`.
