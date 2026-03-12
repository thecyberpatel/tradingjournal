# EdgeJournal — Professional Trade Journal

A full-featured trade journal with authentication, built with React + Vite.

## Features
- Sign up / Sign in with SHA-256 hashed passwords
- Trade logging with 20+ fields (P&L, R-multiple, MAE/MFE, emotions, violations)
- Dashboard with equity curve, daily P&L, setup performance
- Analytics (Sharpe ratio, expectancy, profit factor)
- Psychology tracking (emotion vs performance, rule violations)
- Day planner / playbook
- Risk management & position size calculator
- Trade calendar heatmap
- All data stored in browser localStorage (per user, per device)

## Deploy to Vercel

### Option 1: Via GitHub (recommended)
1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import your GitHub repo
4. Vercel auto-detects Vite — click **Deploy**
5. Done ✓

### Option 2: Vercel CLI
```bash
npm install -g vercel
vercel
```

## Local Development
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Notes
- Data is stored in **localStorage** — it stays in the user's browser.
- Each account's data is namespaced separately (e.g. `ej:u:alice:trades`).
- Passwords are hashed with SHA-256 via the Web Crypto API before storing.
- To share data across devices, a backend database (e.g. Supabase, Firebase) would be needed.
