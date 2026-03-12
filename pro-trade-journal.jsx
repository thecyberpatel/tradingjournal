import { useState, useMemo, useEffect, useCallback } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine, ScatterChart, Scatter, ZAxis
} from "recharts";

// ─── STORAGE ───────────────────────────────────────────────────────────────
async function storageGet(key) {
  try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; } catch { return null; }
}
async function storageSet(key, value) {
  try { await window.storage.set(key, JSON.stringify(value)); } catch {}
}

// ─── CONSTANTS ─────────────────────────────────────────────────────────────
const ASSET_TYPES = ["Stock","Options","Futures","Crypto","Forex"];
const DIRECTIONS = ["Long","Short"];
const SETUPS = ["Breakout","Pullback","Reversal","Momentum","Scalp","Swing","Gap & Go","VWAP Reclaim","Support/Resistance","Earnings Play","News Play","Pre-Market","Opening Range","Mean Reversion","Other"];
const EMOTIONS = ["Calm & Focused","Confident","Disciplined","FOMO","Revenge","Anxious","Overconfident","Greedy","Bored","Uncertain","Tired","In the Zone"];
const GRADES = ["A+","A","B+","B","C","D","F"];
const SESSIONS = ["Pre-Market","Market Open (9:30-10:30)","Late Morning","Midday","Power Hour","After Hours"];
const RULE_VIOLATIONS = ["Chased entry","No stop loss","Oversized position","Averaged down loser","Broke max daily loss","Traded outside plan","FOMO entry","Revenge trade","Moved stop loss","Exited early (fear)","Held too long (greed)","Traded without setup"];
const MARKET_CONDITIONS = ["Trending Up","Trending Down","Range Bound","High Volatility","Low Volatility","News Driven","Choppy"];

const C = {
  bg: "#080b0f", panel: "#0d1117", panel2: "#111820",
  border: "#1a2332", borderBright: "#243040",
  accent: "#00e5b0", accentDim: "#00e5b018", accentGlow: "#00e5b040",
  red: "#ff3d5a", redDim: "#ff3d5a18",
  yellow: "#f5a623", yellowDim: "#f5a62318",
  blue: "#3d8ef0", blueDim: "#3d8ef018",
  purple: "#a78bfa", purpleDim: "#a78bfa18",
  text: "#dde4ee", textMuted: "#4a6080", textDim: "#8899aa",
};

const PIE_COLORS = [C.accent, C.blue, C.yellow, C.red, C.purple, "#fb923c"];

// ─── SAMPLE DATA ───────────────────────────────────────────────────────────
const SAMPLE_TRADES = [
  { id:1, date:"2025-03-03", symbol:"AAPL", assetType:"Stock", direction:"Long", entryPrice:178.50, exitPrice:183.20, qty:100, commission:2, setup:"Breakout", emotion:"Confident", grade:"A", notes:"Clean break above $178 resistance with volume. Held through first pullback. Exited at R2.", tags:["tech","momentum"], market:"NASDAQ", entryTime:"09:45", exitTime:"14:30", stopLoss:175.00, takeProfit:185.00, mae:1.20, mfe:5.80, violations:[], session:"Market Open (9:30-10:30)", marketCondition:"Trending Up", accountSize:50000, riskPercent:1.0, preTradeConfidence:8, postReview:"Executed perfectly. Patient entry, respected the plan." },
  { id:2, date:"2025-03-04", symbol:"TSLA", assetType:"Stock", direction:"Short", entryPrice:195.00, exitPrice:188.50, qty:50, commission:1.5, setup:"Reversal", emotion:"Calm & Focused", grade:"A+", notes:"Distribution at resistance. Short on breakdown. Clean target hit.", tags:["tech","reversal"], market:"NASDAQ", entryTime:"10:15", exitTime:"11:45", stopLoss:198.00, takeProfit:188.00, mae:0.80, mfe:7.20, violations:[], session:"Market Open (9:30-10:30)", marketCondition:"Trending Down", accountSize:50000, riskPercent:0.8, preTradeConfidence:9, postReview:"Best trade of the week. Setup was textbook." },
  { id:3, date:"2025-03-05", symbol:"SPY", assetType:"Options", direction:"Long", entryPrice:4.20, exitPrice:3.10, qty:10, commission:5, setup:"Momentum", emotion:"FOMO", grade:"D", notes:"Chased after missing initial move. No plan, no stop. Classic FOMO.", tags:["index","options"], market:"CBOE", entryTime:"13:00", exitTime:"13:45", stopLoss:3.50, takeProfit:6.00, mae:1.30, mfe:0.20, violations:["FOMO entry","Chased entry","No stop loss"], session:"Midday", marketCondition:"Choppy", accountSize:50000, riskPercent:2.2, preTradeConfidence:4, postReview:"Broke 3 rules. Must wait for setups, not chase." },
  { id:4, date:"2025-03-06", symbol:"BTC-USD", assetType:"Crypto", direction:"Long", entryPrice:62400, exitPrice:64800, qty:0.5, commission:8, setup:"Support/Resistance", emotion:"Disciplined", grade:"B+", notes:"Planned level held perfectly. Partial at R1, runner to R2.", tags:["crypto","swing"], market:"BINANCE", entryTime:"08:00", exitTime:"16:00", stopLoss:61000, takeProfit:65500, mae:800, mfe:2600, violations:[], session:"Pre-Market", marketCondition:"Trending Up", accountSize:50000, riskPercent:1.4, preTradeConfidence:7, postReview:"Good patience. Could have held for R3." },
  { id:5, date:"2025-03-07", symbol:"EUR/USD", assetType:"Forex", direction:"Short", entryPrice:1.0850, exitPrice:1.0780, qty:10000, commission:3, setup:"Pullback", emotion:"Calm & Focused", grade:"A", notes:"Trend continuation. News catalyst aligned with technicals.", tags:["forex","macro"], market:"FX", entryTime:"07:30", exitTime:"12:00", stopLoss:1.0900, takeProfit:1.0750, mae:0.0010, mfe:0.0080, violations:[], session:"Pre-Market", marketCondition:"Trending Down", accountSize:50000, riskPercent:1.0, preTradeConfidence:8, postReview:"Perfect execution on a planned trade." },
  { id:6, date:"2025-03-10", symbol:"NVDA", assetType:"Stock", direction:"Long", entryPrice:875.00, exitPrice:892.50, qty:20, commission:2, setup:"Gap & Go", emotion:"In the Zone", grade:"A+", notes:"Pre-market catalyst. Gap continuation held VWAP all day. Added at flag.", tags:["tech","AI","gap"], market:"NASDAQ", entryTime:"09:32", exitTime:"10:15", stopLoss:865.00, takeProfit:895.00, mae:2.50, mfe:19.50, violations:[], session:"Market Open (9:30-10:30)", marketCondition:"High Volatility", accountSize:50000, riskPercent:1.0, preTradeConfidence:9, postReview:"Best gap trade this month. Adding to playbook." },
  { id:7, date:"2025-03-11", symbol:"QQQ", assetType:"Options", direction:"Short", entryPrice:8.50, exitPrice:12.30, qty:5, commission:4, setup:"Reversal", emotion:"Disciplined", grade:"A", notes:"Put spread at tech resistance. Held conviction through morning squeeze.", tags:["index","hedge"], market:"CBOE", entryTime:"11:00", exitTime:"15:30", stopLoss:7.00, takeProfit:13.00, mae:1.50, mfe:4.20, violations:[], session:"Late Morning", marketCondition:"High Volatility", accountSize:50000, riskPercent:0.9, preTradeConfidence:8, postReview:"Stayed with plan despite heat. Paid off." },
  { id:8, date:"2025-03-12", symbol:"ES", assetType:"Futures", direction:"Long", entryPrice:5245.00, exitPrice:5255.00, qty:2, commission:8, setup:"VWAP Reclaim", emotion:"Calm & Focused", grade:"B+", notes:"Scalp off VWAP reclaim. Quick 10pt target. Clean in and out.", tags:["futures","scalp"], market:"CME", entryTime:"10:30", exitTime:"10:55", stopLoss:5238.00, takeProfit:5256.00, mae:3.00, mfe:12.00, violations:[], session:"Late Morning", marketCondition:"Range Bound", accountSize:50000, riskPercent:0.6, preTradeConfidence:7, postReview:"Solid scalp. Right time right place." },
];

const SAMPLE_PLANS = [
  { id:1, date:"2025-03-11", bias:"Bullish", keyLevels:"SPY: 520 support, 525 resistance. AAPL: Watch $183 breakout.", watchlist:"NVDA, AAPL, META, SPY", maxLoss:500, targets:"2 clean setups only. No overtrading.", energyScore:8, notes:"Fed minutes today at 2pm — reduce size around that window.", marketCondition:"High Volatility" },
  { id:2, date:"2025-03-12", bias:"Neutral", keyLevels:"ES: 5240 key level. If holds → long. If breaks → short 5220.", watchlist:"ES, NQ, BTC", maxLoss:400, targets:"1-2 scalps only. Protect weekly profits.", energyScore:7, notes:"Thursday — historically choppy. Be selective.", marketCondition:"Range Bound" },
];

// ─── UTILITIES ─────────────────────────────────────────────────────────────
const calcPnL = t => {
  const raw = t.direction === "Long"
    ? (t.exitPrice - t.entryPrice) * t.qty
    : (t.entryPrice - t.exitPrice) * t.qty;
  return raw - (t.commission || 0);
};

const calcR = t => {
  if (!t.stopLoss) return null;
  const risk = Math.abs(t.entryPrice - t.stopLoss) * t.qty;
  if (risk === 0) return null;
  return calcPnL(t) / risk;
};

const calcExpectancy = trades => {
  if (!trades.length) return 0;
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl <= 0);
  const wr = wins.length / trades.length;
  const avgW = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgL = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;
  return (wr * avgW) - ((1 - wr) * avgL);
};

const calcSharpe = trades => {
  if (trades.length < 2) return 0;
  const returns = trades.map(t => t.pnl);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const std = Math.sqrt(returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length);
  return std === 0 ? 0 : (mean / std) * Math.sqrt(252);
};

const fmt = (n, d = 2) => {
  const abs = Math.abs(n).toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return n >= 0 ? `+$${abs}` : `-$${abs}`;
};
const fmtN = n => Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const pct = n => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

// ─── COMPONENTS ────────────────────────────────────────────────────────────
const Pill = ({ children, color = C.accent }) => (
  <span style={{ background: color + "20", color, padding: "2px 7px", fontSize: 9, letterSpacing: "0.08em", borderRadius: 2, fontWeight: 600 }}>{children}</span>
);

const StatBox = ({ label, value, sub, color = C.text, glow }) => (
  <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: "14px 16px", transition: "border-color 0.2s", cursor: "default" }}
    onMouseEnter={e => e.currentTarget.style.borderColor = C.borderBright}
    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
    <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: "0.12em", marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 700, color, textShadow: glow ? `0 0 20px ${color}80` : "none", letterSpacing: "-0.02em" }}>{value}</div>
    {sub && <div style={{ fontSize: 9, color: C.textMuted, marginTop: 3 }}>{sub}</div>}
  </div>
);

const SectionHeader = ({ title, action }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
    <div style={{ fontSize: 9, letterSpacing: "0.15em", color: C.textMuted, fontWeight: 600 }}>{title}</div>
    {action}
  </div>
);

const Panel = ({ children, style = {} }) => (
  <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: 20, ...style }}>{children}</div>
);

const customTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.panel2, border: `1px solid ${C.borderBright}`, padding: "10px 14px", fontSize: 11 }}>
      <div style={{ color: C.textMuted, marginBottom: 4, fontSize: 9 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.value >= 0 ? C.accent : C.red }}>
          {typeof p.value === "number" ? `$${p.value.toFixed(2)}` : p.value}
        </div>
      ))}
    </div>
  );
};

// ─── MAIN APP ──────────────────────────────────────────────────────────────
export default function ProTradeJournal() {
  const [trades, setTrades] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [modal, setModal] = useState(null); // "trade" | "plan" | "detail" | "review"
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [filterAsset, setFilterAsset] = useState("All");
  const [filterDir, setFilterDir] = useState("All");
  const [searchQ, setSearchQ] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [accountSize, setAccountSize] = useState(50000);
  const [dailyMaxLoss, setDailyMaxLoss] = useState(500);
  const [riskPerTrade, setRiskPerTrade] = useState(1.0);
  const [posCalc, setPosCalc] = useState({ entry: "", stop: "", risk: "" });
  const [riskTab, setRiskTab] = useState("calc");

  // Load from storage
  useEffect(() => {
    (async () => {
      const t = await storageGet("ptj-trades");
      const p = await storageGet("ptj-plans");
      const s = await storageGet("ptj-settings");
      setTrades(t || SAMPLE_TRADES);
      setPlans(p || SAMPLE_PLANS);
      if (s) { setAccountSize(s.accountSize || 50000); setDailyMaxLoss(s.dailyMaxLoss || 500); setRiskPerTrade(s.riskPerTrade || 1.0); }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) storageSet("ptj-trades", trades); }, [trades, loaded]);
  useEffect(() => { if (loaded) storageSet("ptj-plans", plans); }, [plans, loaded]);
  useEffect(() => {
    if (loaded) storageSet("ptj-settings", { accountSize, dailyMaxLoss, riskPerTrade });
  }, [accountSize, dailyMaxLoss, riskPerTrade, loaded]);

  // ── Derived Stats ──
  const tw = useMemo(() => trades.map(t => ({ ...t, pnl: calcPnL(t), rMultiple: calcR(t), win: calcPnL(t) > 0 })), [trades]);

  const stats = useMemo(() => {
    if (!tw.length) return { totalPnL: 0, winRate: 0, totalTrades: 0, wins: 0, losses: 0, avgWin: 0, avgLoss: 0, rr: 0, avgR: 0, maxDD: 0, profitFactor: 0, expectancy: 0, sharpe: 0, bestTrade: null, worstTrade: null, streak: { current: 0, type: "none" }, avgHold: 0, totalRisk: 0 };
    const wins = tw.filter(x => x.win), losses = tw.filter(x => !x.win);
    const totalPnL = tw.reduce((s, x) => s + x.pnl, 0);
    const avgWin = wins.length ? wins.reduce((s, x) => s + x.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((s, x) => s + x.pnl, 0) / losses.length : 0;
    const rValues = tw.map(x => x.rMultiple).filter(x => x !== null);
    const avgR = rValues.length ? rValues.reduce((a, b) => a + b, 0) / rValues.length : 0;
    let peak = 0, maxDD = 0, running = 0;
    [...tw].sort((a, b) => a.date.localeCompare(b.date)).forEach(x => {
      running += x.pnl; if (running > peak) peak = running;
      const dd = peak - running; if (dd > maxDD) maxDD = dd;
    });
    const profitFactor = losses.length ? Math.abs(wins.reduce((s, x) => s + x.pnl, 0) / (losses.reduce((s, x) => s + x.pnl, 0) || 1)) : 99;
    const sorted = [...tw].sort((a, b) => b.date.localeCompare(a.date));
    let streak = 0; const st = sorted[0]?.win;
    for (const t of sorted) { if (t.win === st) streak++; else break; }
    const violationTrades = tw.filter(t => t.violations?.length > 0);
    return {
      totalPnL, winRate: (wins.length / tw.length) * 100,
      totalTrades: tw.length, wins: wins.length, losses: losses.length,
      avgWin, avgLoss, rr: avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0, avgR, maxDD,
      profitFactor, expectancy: calcExpectancy(tw), sharpe: calcSharpe(tw),
      bestTrade: tw.reduce((a, b) => a.pnl > b.pnl ? a : b),
      worstTrade: tw.reduce((a, b) => a.pnl < b.pnl ? a : b),
      streak: { current: streak, type: st ? "win" : "loss" },
      ruleAdherence: tw.length ? ((tw.length - violationTrades.length) / tw.length) * 100 : 100,
      avgConfidence: tw.length ? tw.reduce((s, t) => s + (t.preTradeConfidence || 5), 0) / tw.length : 0,
    };
  }, [tw]);

  const equityCurve = useMemo(() => {
    let cum = 0;
    return [...tw].sort((a, b) => a.date.localeCompare(b.date)).map((t, i) => {
      cum += t.pnl; return { n: i + 1, pnl: parseFloat(cum.toFixed(2)), date: t.date.slice(5), daily: t.pnl };
    });
  }, [tw]);

  const pnlByDay = useMemo(() => {
    const map = {};
    tw.forEach(t => { map[t.date] = (map[t.date] || 0) + t.pnl; });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
      .map(([d, pnl]) => ({ date: d.slice(5), pnl: parseFloat(pnl.toFixed(2)) }));
  }, [tw]);

  const todayPnL = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return tw.filter(t => t.date === today).reduce((s, t) => s + t.pnl, 0);
  }, [tw]);

  const todayTrades = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return tw.filter(t => t.date === today);
  }, [tw]);

  const setupBreakdown = useMemo(() => {
    const map = {};
    tw.forEach(t => {
      if (!map[t.setup]) map[t.setup] = { wins: 0, total: 0, pnl: 0, rSum: 0, rCount: 0 };
      map[t.setup].total++; if (t.win) map[t.setup].wins++;
      map[t.setup].pnl += t.pnl;
      if (t.rMultiple !== null) { map[t.setup].rSum += t.rMultiple; map[t.setup].rCount++; }
    });
    return Object.entries(map).map(([setup, v]) => ({
      setup, ...v, winRate: (v.wins / v.total * 100).toFixed(0), avgR: v.rCount ? (v.rSum / v.rCount).toFixed(2) : "—"
    })).sort((a, b) => b.pnl - a.pnl);
  }, [tw]);

  const sessionBreakdown = useMemo(() => {
    const map = {};
    tw.forEach(t => {
      const s = t.session || "Unknown";
      if (!map[s]) map[s] = { wins: 0, total: 0, pnl: 0 };
      map[s].total++; if (t.win) map[s].wins++; map[s].pnl += t.pnl;
    });
    return Object.entries(map).map(([session, v]) => ({ session, ...v, winRate: (v.wins / v.total * 100).toFixed(0) })).sort((a, b) => b.pnl - a.pnl);
  }, [tw]);

  const emotionBreakdown = useMemo(() => {
    const map = {};
    tw.forEach(t => {
      if (!map[t.emotion]) map[t.emotion] = { wins: 0, total: 0, pnl: 0 };
      map[t.emotion].total++; if (t.win) map[t.emotion].wins++; map[t.emotion].pnl += t.pnl;
    });
    return Object.entries(map).map(([emotion, v]) => ({ emotion, ...v, winRate: (v.wins / v.total * 100).toFixed(0) })).sort((a, b) => b.pnl - a.pnl);
  }, [tw]);

  const violationStats = useMemo(() => {
    const map = {};
    tw.forEach(t => (t.violations || []).forEach(v => {
      if (!map[v]) map[v] = { count: 0, pnl: 0 };
      map[v].count++; map[v].pnl += t.pnl;
    }));
    return Object.entries(map).map(([v, d]) => ({ violation: v, ...d })).sort((a, b) => b.count - a.count);
  }, [tw]);

  const maeVsMfe = useMemo(() => tw.filter(t => t.mae != null && t.mfe != null).map(t => ({ symbol: t.symbol, mae: t.mae, mfe: t.mfe, pnl: t.pnl, win: t.win })), [tw]);

  const filteredTrades = useMemo(() => {
    let t = [...tw];
    if (filterAsset !== "All") t = t.filter(x => x.assetType === filterAsset);
    if (filterDir !== "All") t = t.filter(x => x.direction === filterDir);
    if (searchQ) t = t.filter(x => [x.symbol, x.setup, x.notes, ...(x.tags || [])].join(" ").toLowerCase().includes(searchQ.toLowerCase()));
    t.sort((a, b) => {
      const va = a[sortBy], vb = b[sortBy];
      return typeof va === "string" ? (sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)) : (sortAsc ? va - vb : vb - va);
    });
    return t;
  }, [tw, filterAsset, filterDir, searchQ, sortBy, sortAsc]);

  // ── Pos Size Calculator ──
  const posResult = useMemo(() => {
    const e = parseFloat(posCalc.entry), s = parseFloat(posCalc.stop);
    const r = parseFloat(posCalc.risk) || riskPerTrade;
    if (!e || !s || e === s) return null;
    const riskAmt = accountSize * (r / 100);
    const riskPerShare = Math.abs(e - s);
    const shares = Math.floor(riskAmt / riskPerShare);
    return { shares, riskAmt, riskPerShare, totalValue: shares * e, rPct: r };
  }, [posCalc, accountSize, riskPerTrade]);

  // ── Trade Form ──
  const emptyTrade = { date: new Date().toISOString().split("T")[0], symbol: "", assetType: "Stock", direction: "Long", entryPrice: "", exitPrice: "", qty: "", commission: "", setup: "Breakout", emotion: "Calm & Focused", grade: "B", notes: "", tags: "", market: "NASDAQ", entryTime: "", exitTime: "", stopLoss: "", takeProfit: "", mae: "", mfe: "", violations: [], session: "Market Open (9:30-10:30)", marketCondition: "Trending Up", accountSize: accountSize, riskPercent: riskPerTrade, preTradeConfidence: 7, postReview: "" };
  const [tradeForm, setTradeForm] = useState(emptyTrade);
  const [planForm, setPlanForm] = useState({ date: new Date().toISOString().split("T")[0], bias: "Neutral", keyLevels: "", watchlist: "", maxLoss: dailyMaxLoss, targets: "", energyScore: 7, notes: "", marketCondition: "Range Bound" });

  const tf = (k, v) => setTradeForm(f => ({ ...f, [k]: v }));

  function saveTrade() {
    const t = { ...tradeForm, id: Date.now(), entryPrice: parseFloat(tradeForm.entryPrice), exitPrice: parseFloat(tradeForm.exitPrice), qty: parseFloat(tradeForm.qty), commission: parseFloat(tradeForm.commission || 0), stopLoss: parseFloat(tradeForm.stopLoss || 0), takeProfit: parseFloat(tradeForm.takeProfit || 0), mae: parseFloat(tradeForm.mae || 0), mfe: parseFloat(tradeForm.mfe || 0), preTradeConfidence: parseInt(tradeForm.preTradeConfidence || 7), tags: typeof tradeForm.tags === "string" ? tradeForm.tags.split(",").map(s => s.trim()).filter(Boolean) : tradeForm.tags };
    setTrades(prev => [...prev, t]);
    setModal(null); setTradeForm(emptyTrade);
  }

  function savePlan() {
    const p = { ...planForm, id: Date.now(), maxLoss: parseFloat(planForm.maxLoss || 0), energyScore: parseInt(planForm.energyScore || 7) };
    setPlans(prev => [...prev, p]);
    setModal(null);
  }

  function deleteTrade(id) { setTrades(p => p.filter(t => t.id !== id)); setSelectedTrade(null); }
  function deletePlan(id) { setPlans(p => p.filter(t => t.id !== id)); setSelectedPlan(null); }

  const TABS = [
    { id: "dashboard", label: "DASHBOARD" },
    { id: "trades", label: "TRADE LOG" },
    { id: "analytics", label: "ANALYTICS" },
    { id: "psychology", label: "PSYCHOLOGY" },
    { id: "playbook", label: "PLAYBOOK" },
    { id: "risk", label: "RISK" },
    { id: "calendar", label: "CALENDAR" },
  ];

  const dailyLossWarning = Math.abs(Math.min(todayPnL, 0)) / dailyMaxLoss;

  if (!loaded) return <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: "0.2em" }}>LOADING JOURNAL...</div>;

  return (
    <div style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", background: C.bg, minHeight: "100vh", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Syne:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-track { background:${C.bg}; }
        ::-webkit-scrollbar-thumb { background:${C.border}; }
        .inp { background:#ffffff08; border:1px solid ${C.border}; color:${C.text}; padding:8px 11px; width:100%; outline:none; font-family:inherit; font-size:11px; transition:border-color .15s; }
        .inp:focus { border-color:${C.accent}44; }
        .inp::placeholder { color:${C.textMuted}; }
        select.inp { cursor:pointer; }
        .btn-p { background:${C.accent}; color:#000; border:none; cursor:pointer; font-family:inherit; font-weight:700; letter-spacing:.08em; transition:all .15s; }
        .btn-p:hover { background:#00ffcc; box-shadow:0 0 20px ${C.accentGlow}; }
        .btn-g { background:transparent; border:1px solid ${C.border}; color:${C.textDim}; cursor:pointer; font-family:inherit; font-size:11px; transition:all .15s; }
        .btn-g:hover { border-color:${C.accent}; color:${C.accent}; }
        .tr:hover td { background:#ffffff06 !important; }
        .tab { background:none; border:none; cursor:pointer; font-family:inherit; font-size:10px; letter-spacing:.12em; transition:all .15s; padding:16px 14px; border-bottom:2px solid transparent; }
        .tab:hover { color:${C.accent}; }
        .chk { display:flex; align-items:center; gap:6px; cursor:pointer; padding:4px 0; }
        .chk input { accent-color:${C.accent}; width:13px; height:13px; }
        .violation-badge { display:inline-block; background:${C.redDim}; color:${C.red}; padding:2px 7px; font-size:9px; margin:2px; border-radius:2px; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        .fade-in { animation:fadeIn .2s ease; }
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.panel, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, background: C.accentDim, border: `1px solid ${C.accent}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 8, height: 8, background: C.accent, borderRadius: "50%", boxShadow: `0 0 10px ${C.accent}` }} />
              </div>
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: "0.1em", color: C.text }}>EDGE<span style={{ color: C.accent }}>JOURNAL</span></div>
                <div style={{ fontSize: 8, color: C.textMuted, letterSpacing: "0.15em" }}>PROFESSIONAL TRADE LOG</div>
              </div>
            </div>
            <div style={{ width: 1, height: 28, background: C.border, margin: "0 8px" }} />
            <div style={{ display: "flex" }}>
              {TABS.map(t => (
                <button key={t.id} className="tab" onClick={() => setTab(t.id)}
                  style={{ color: tab === t.id ? C.accent : C.textMuted, borderBottomColor: tab === t.id ? C.accent : "transparent" }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {dailyLossWarning > 0.6 && (
              <div style={{ background: C.redDim, border: `1px solid ${C.red}44`, padding: "4px 12px", fontSize: 9, color: C.red, letterSpacing: "0.1em" }}>
                ⚠ {(dailyLossWarning * 100).toFixed(0)}% DAILY LOSS LIMIT
              </div>
            )}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: "0.1em" }}>ACCOUNT P&L</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: stats.totalPnL >= 0 ? C.accent : C.red, letterSpacing: "-0.02em", textShadow: `0 0 20px ${stats.totalPnL >= 0 ? C.accent : C.red}60` }}>
                {fmt(stats.totalPnL)}
              </div>
            </div>
            <div style={{ width: 1, height: 28, background: C.border }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-g" onClick={() => { setPlanForm({ ...planForm, date: new Date().toISOString().split("T")[0] }); setModal("plan"); }} style={{ padding: "7px 12px", fontSize: 10, letterSpacing: "0.1em" }}>+ PLAN DAY</button>
              <button className="btn-p" onClick={() => { setTradeForm(emptyTrade); setModal("trade"); }} style={{ padding: "7px 14px", fontSize: 10, letterSpacing: "0.1em" }}>+ LOG TRADE</button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 24px" }} className="fade-in">

        {/* ════════════════════════════════ DASHBOARD ════════════════════════════════ */}
        {tab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Top KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 10 }}>
              <StatBox label="WIN RATE" value={`${stats.winRate.toFixed(1)}%`} color={stats.winRate >= 50 ? C.accent : C.yellow} glow />
              <StatBox label="NET P&L" value={fmt(stats.totalPnL, 0)} color={stats.totalPnL >= 0 ? C.accent : C.red} glow />
              <StatBox label="EXPECTANCY" value={fmt(stats.expectancy, 0)} sub="per trade" color={stats.expectancy >= 0 ? C.accent : C.red} />
              <StatBox label="PROFIT FACTOR" value={isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : "∞"} color={stats.profitFactor >= 1.5 ? C.accent : C.red} />
              <StatBox label="SHARPE RATIO" value={stats.sharpe.toFixed(2)} color={stats.sharpe >= 1 ? C.accent : stats.sharpe >= 0 ? C.yellow : C.red} />
              <StatBox label="AVG R-MULTIPLE" value={`${stats.avgR.toFixed(2)}R`} color={stats.avgR >= 1 ? C.accent : C.red} />
              <StatBox label="MAX DRAWDOWN" value={`$${stats.maxDD.toFixed(0)}`} color={C.red} />
              <StatBox label="RULE ADHERENCE" value={`${stats.ruleAdherence.toFixed(0)}%`} color={stats.ruleAdherence >= 85 ? C.accent : C.yellow} />
              <StatBox label="STREAK" value={`${stats.streak.current}${stats.streak.type === "win" ? "W" : "L"}`} sub={stats.streak.type === "win" ? "winning" : "losing"} color={stats.streak.type === "win" ? C.accent : C.red} />
            </div>

            {/* Equity Curve + Daily PnL */}
            <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 12 }}>
              <Panel>
                <SectionHeader title="EQUITY CURVE" />
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={equityCurve}>
                    <defs>
                      <linearGradient id="ec" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.accent} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke={C.border} />
                    <XAxis dataKey="n" tick={{ fill: C.textMuted, fontSize: 8 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: C.textMuted, fontSize: 8 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip content={customTooltip} />
                    <ReferenceLine y={0} stroke={C.border} strokeDasharray="4 4" />
                    <Area type="monotone" dataKey="pnl" stroke={C.accent} strokeWidth={2} fill="url(#ec)" dot={false} activeDot={{ r: 4, fill: C.accent, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Panel>
              <Panel>
                <SectionHeader title="DAILY P&L" />
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={pnlByDay}>
                    <CartesianGrid strokeDasharray="2 4" stroke={C.border} />
                    <XAxis dataKey="date" tick={{ fill: C.textMuted, fontSize: 8 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: C.textMuted, fontSize: 8 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip content={customTooltip} />
                    <ReferenceLine y={0} stroke={C.border} />
                    <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                      {pnlByDay.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? C.accent : C.red} fillOpacity={0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
            </div>

            {/* Setup + Session + Asset Breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
              <Panel>
                <SectionHeader title="SETUP PERFORMANCE" />
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {setupBreakdown.slice(0, 7).map(s => (
                    <div key={s.setup} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 90, fontSize: 9, color: C.textDim, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.setup}</div>
                      <div style={{ flex: 1, height: 3, background: C.border }}>
                        <div style={{ width: `${s.winRate}%`, height: "100%", background: parseInt(s.winRate) >= 50 ? C.accent : C.red, transition: "width .4s" }} />
                      </div>
                      <div style={{ fontSize: 9, color: C.textMuted, width: 28, textAlign: "right" }}>{s.winRate}%</div>
                      <div style={{ fontSize: 9, width: 30, textAlign: "right", color: C.textMuted }}>{s.avgR}R</div>
                      <div style={{ fontSize: 9, width: 52, textAlign: "right", color: s.pnl >= 0 ? C.accent : C.red }}>{s.pnl >= 0 ? "+" : ""}${Math.abs(s.pnl).toFixed(0)}</div>
                      <div style={{ fontSize: 9, color: C.textMuted, width: 18 }}>{s.total}T</div>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel>
                <SectionHeader title="BY SESSION" />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {sessionBreakdown.map(s => (
                    <div key={s.session} style={{ padding: "8px 10px", background: "#ffffff05", borderLeft: `2px solid ${s.pnl >= 0 ? C.accent : C.red}40` }}>
                      <div style={{ fontSize: 9, color: C.textDim, marginBottom: 3 }}>{s.session.replace("Market Open (9:30-10:30)", "Open")}</div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: s.pnl >= 0 ? C.accent : C.red }}>{s.pnl >= 0 ? "+" : ""}${Math.abs(s.pnl).toFixed(0)}</span>
                        <span style={{ fontSize: 9, color: C.textMuted }}>{s.winRate}% WR</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel>
                <SectionHeader title="BY ASSET" />
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={(() => { const m = {}; tw.forEach(t => { m[t.assetType] = (m[t.assetType] || 0) + 1; }); return Object.entries(m).map(([n, v]) => ({ name: n, value: v })); })()} dataKey="value" cx="50%" cy="50%" outerRadius={50} innerRadius={28}>
                      {ASSET_TYPES.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: C.panel2, border: `1px solid ${C.borderBright}`, fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {(() => { const m = {}; tw.forEach(t => { if (!m[t.assetType]) m[t.assetType] = { pnl: 0, c: 0 }; m[t.assetType].pnl += t.pnl; m[t.assetType].c++; }); return Object.entries(m).map(([k, v], i) => (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: C.textDim }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: PIE_COLORS[i] }} />
                      {k} <span style={{ color: v.pnl >= 0 ? C.accent : C.red }}>{v.pnl >= 0 ? "+" : ""}${Math.abs(v.pnl).toFixed(0)}</span>
                    </div>
                  )); })()}
                </div>
              </Panel>
            </div>

            {/* Today Summary + Recent Plans */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
              <Panel>
                <SectionHeader title="TODAY'S SESSION" />
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: "0.12em", marginBottom: 8 }}>TODAY P&L</div>
                  <div style={{ fontSize: 36, fontWeight: 700, color: todayPnL >= 0 ? C.accent : C.red, letterSpacing: "-0.03em", textShadow: `0 0 30px ${todayPnL >= 0 ? C.accent : C.red}50` }}>
                    {fmt(todayPnL, 0)}
                  </div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>{todayTrades.length} trades today</div>
                  <div style={{ margin: "16px 0 8px", height: 4, background: C.border, borderRadius: 2 }}>
                    <div style={{ width: `${Math.min((Math.abs(todayPnL) / dailyMaxLoss) * 100, 100)}%`, height: "100%", background: todayPnL < 0 ? C.red : C.accent, borderRadius: 2, transition: "width .5s" }} />
                  </div>
                  <div style={{ fontSize: 9, color: C.textMuted }}>{todayPnL < 0 ? `${((Math.abs(todayPnL) / dailyMaxLoss) * 100).toFixed(0)}% of daily loss limit` : "Daily loss limit safe"}</div>
                </div>
              </Panel>
              <Panel>
                <SectionHeader title="RECENT DAY PLANS" action={<button className="btn-g" onClick={() => setModal("plan")} style={{ padding: "4px 10px", fontSize: 9 }}>+ NEW PLAN</button>} />
                {plans.slice(-3).reverse().map(p => (
                  <div key={p.id} style={{ padding: "10px 12px", background: "#ffffff05", marginBottom: 8, borderLeft: `2px solid ${p.bias === "Bullish" ? C.accent : p.bias === "Bearish" ? C.red : C.yellow}40`, cursor: "pointer" }}
                    onClick={() => { setSelectedPlan(p); setTab("playbook"); }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600 }}>{p.date}</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Pill color={p.bias === "Bullish" ? C.accent : p.bias === "Bearish" ? C.red : C.yellow}>{p.bias}</Pill>
                        <span style={{ fontSize: 9, color: C.textMuted }}>Energy: {p.energyScore}/10</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 9, color: C.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.keyLevels}</div>
                  </div>
                ))}
              </Panel>
            </div>
          </div>
        )}

        {/* ════════════════════════════════ TRADE LOG ════════════════════════════════ */}
        {tab === "trades" && (
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input className="inp" placeholder="Search symbol, setup, tags, notes..." value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ maxWidth: 300 }} />
                <select className="inp" value={filterAsset} onChange={e => setFilterAsset(e.target.value)} style={{ width: 110 }}>
                  <option>All</option>{ASSET_TYPES.map(a => <option key={a}>{a}</option>)}
                </select>
                <select className="inp" value={filterDir} onChange={e => setFilterDir(e.target.value)} style={{ width: 100 }}>
                  <option>All</option><option>Long</option><option>Short</option>
                </select>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 10, color: C.textMuted }}>{filteredTrades.length} TRADES</span>
                  <div style={{ fontSize: 11, fontWeight: 600, color: filteredTrades.reduce((s, t) => s + t.pnl, 0) >= 0 ? C.accent : C.red }}>
                    {fmt(filteredTrades.reduce((s, t) => s + t.pnl, 0))}
                  </div>
                </div>
              </div>

              <Panel style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {[["date","DATE"],["symbol","SYMBOL"],["assetType","TYPE"],["direction","DIR"],["entryPrice","ENTRY"],["exitPrice","EXIT"],["qty","QTY"],["pnl","P&L"],["rMultiple","R"],["setup","SETUP"],["emotion","MOOD"],["grade","GRADE"]].map(([k, l]) => (
                        <th key={k} onClick={() => { if (sortBy === k) setSortAsc(!sortAsc); else { setSortBy(k); setSortAsc(false); } }}
                          style={{ padding: "10px 12px", textAlign: "left", fontSize: 8, color: C.textMuted, letterSpacing: "0.1em", cursor: "pointer", userSelect: "none", fontWeight: 600, whiteSpace: "nowrap" }}>
                          {l}{sortBy === k ? (sortAsc ? " ↑" : " ↓") : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.map(t => (
                      <tr key={t.id} className="tr" onClick={() => setSelectedTrade(selectedTrade?.id === t.id ? null : t)}
                        style={{ cursor: "pointer", borderTop: `1px solid ${C.border}18`, background: selectedTrade?.id === t.id ? "#ffffff08" : "transparent" }}>
                        <td style={{ padding: "9px 12px", color: C.textMuted, fontSize: 10, whiteSpace: "nowrap" }}>{t.date}</td>
                        <td style={{ padding: "9px 12px", fontWeight: 700, letterSpacing: "0.05em" }}>{t.symbol}</td>
                        <td style={{ padding: "9px 12px", fontSize: 9, color: C.textDim }}>{t.assetType}</td>
                        <td style={{ padding: "9px 12px" }}>
                          <span style={{ color: t.direction === "Long" ? C.accent : C.red, fontSize: 9, fontWeight: 700 }}>{t.direction === "Long" ? "▲ LONG" : "▼ SHORT"}</span>
                        </td>
                        <td style={{ padding: "9px 12px", color: C.textDim, fontFamily: "inherit" }}>{fmtN(t.entryPrice)}</td>
                        <td style={{ padding: "9px 12px", color: C.textDim }}>{fmtN(t.exitPrice)}</td>
                        <td style={{ padding: "9px 12px", color: C.textMuted }}>{t.qty}</td>
                        <td style={{ padding: "9px 12px", fontWeight: 700, color: t.pnl >= 0 ? C.accent : C.red }}>{fmt(t.pnl)}</td>
                        <td style={{ padding: "9px 12px", fontSize: 10, color: t.rMultiple >= 1 ? C.accent : t.rMultiple >= 0 ? C.yellow : C.red }}>{t.rMultiple !== null ? `${t.rMultiple.toFixed(2)}R` : "—"}</td>
                        <td style={{ padding: "9px 12px", fontSize: 9, color: C.textDim }}>{t.setup}</td>
                        <td style={{ padding: "9px 12px", fontSize: 9, color: C.textDim }}>{t.emotion?.split(" ")[0]}</td>
                        <td style={{ padding: "9px 12px" }}>
                          <Pill color={t.grade?.startsWith("A") ? C.accent : t.grade?.startsWith("B") ? C.blue : C.red}>{t.grade}</Pill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            </div>

            {/* Detail Panel */}
            {selectedTrade && (
              <div style={{ width: 340, flexShrink: 0 }} className="fade-in">
                <Panel style={{ maxHeight: "calc(100vh - 100px)", overflowY: "auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>{selectedTrade.symbol}</div>
                      <div style={{ fontSize: 9, color: C.textMuted, marginTop: 1 }}>{selectedTrade.assetType} · {selectedTrade.market} · {selectedTrade.date}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: selectedTrade.pnl >= 0 ? C.accent : C.red }}>{fmt(selectedTrade.pnl)}</div>
                      {selectedTrade.rMultiple !== null && <div style={{ fontSize: 11, color: selectedTrade.rMultiple >= 0 ? C.accent : C.red }}>{selectedTrade.rMultiple.toFixed(2)}R</div>}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
                    {[["Direction", selectedTrade.direction, selectedTrade.direction === "Long" ? C.accent : C.red],
                      ["Grade", selectedTrade.grade, selectedTrade.grade?.startsWith("A") ? C.accent : C.blue],
                      ["Entry", fmtN(selectedTrade.entryPrice), C.text], ["Exit", fmtN(selectedTrade.exitPrice), C.text],
                      ["Qty", selectedTrade.qty, C.text], ["Commission", `$${selectedTrade.commission}`, C.text],
                      ["Stop Loss", selectedTrade.stopLoss ? fmtN(selectedTrade.stopLoss) : "—", C.red],
                      ["Target", selectedTrade.takeProfit ? fmtN(selectedTrade.takeProfit) : "—", C.accent],
                      ["Entry Time", selectedTrade.entryTime || "—", C.text], ["Exit Time", selectedTrade.exitTime || "—", C.text],
                      ["MAE", selectedTrade.mae ? `${selectedTrade.mae}` : "—", C.red], ["MFE", selectedTrade.mfe ? `${selectedTrade.mfe}` : "—", C.accent],
                      ["Session", selectedTrade.session || "—", C.text], ["Confidence", `${selectedTrade.preTradeConfidence || "—"}/10`, C.yellow],
                    ].map(([k, v, col]) => (
                      <div key={k} style={{ background: "#ffffff05", padding: "7px 9px" }}>
                        <div style={{ fontSize: 8, color: C.textMuted, letterSpacing: "0.1em" }}>{k.toUpperCase()}</div>
                        <div style={{ fontSize: 12, color: col, marginTop: 2, fontWeight: 500 }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                    <div style={{ flex: 1, background: "#ffffff05", padding: "8px 10px" }}>
                      <div style={{ fontSize: 8, color: C.textMuted }}>SETUP</div>
                      <div style={{ fontSize: 11, color: C.accent, marginTop: 2 }}>{selectedTrade.setup}</div>
                    </div>
                    <div style={{ flex: 1, background: "#ffffff05", padding: "8px 10px" }}>
                      <div style={{ fontSize: 8, color: C.textMuted }}>EMOTION</div>
                      <div style={{ fontSize: 11, marginTop: 2 }}>{selectedTrade.emotion}</div>
                    </div>
                  </div>

                  {selectedTrade.violations?.length > 0 && (
                    <div style={{ background: C.redDim, border: `1px solid ${C.red}22`, padding: "10px", marginBottom: 10 }}>
                      <div style={{ fontSize: 8, color: C.red, letterSpacing: "0.1em", marginBottom: 6 }}>⚠ RULE VIOLATIONS</div>
                      <div>{selectedTrade.violations.map(v => <span key={v} className="violation-badge">{v}</span>)}</div>
                    </div>
                  )}

                  {selectedTrade.notes && (
                    <div style={{ background: "#ffffff05", padding: "10px", marginBottom: 10 }}>
                      <div style={{ fontSize: 8, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 6 }}>TRADE NOTES</div>
                      <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.7 }}>{selectedTrade.notes}</div>
                    </div>
                  )}
                  {selectedTrade.postReview && (
                    <div style={{ background: C.accentDim, border: `1px solid ${C.accent}22`, padding: "10px", marginBottom: 10 }}>
                      <div style={{ fontSize: 8, color: C.accent, letterSpacing: "0.1em", marginBottom: 6 }}>POST-TRADE REVIEW</div>
                      <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.7 }}>{selectedTrade.postReview}</div>
                    </div>
                  )}

                  {selectedTrade.tags?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                      {selectedTrade.tags.map(tag => <Pill key={tag}>#{tag}</Pill>)}
                    </div>
                  )}

                  <button className="btn-g" onClick={() => deleteTrade(selectedTrade.id)}
                    style={{ width: "100%", padding: "8px", fontSize: 10, letterSpacing: "0.1em", color: C.red, borderColor: C.red + "44" }}>
                    DELETE TRADE
                  </button>
                </Panel>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════ ANALYTICS ════════════════════════════════ */}
        {tab === "analytics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <StatBox label="TOTAL TRADES" value={stats.totalTrades} sub={`${stats.wins}W / ${stats.losses}L`} />
              <StatBox label="AVG WIN" value={`$${stats.avgWin.toFixed(0)}`} color={C.accent} />
              <StatBox label="AVG LOSS" value={`$${Math.abs(stats.avgLoss).toFixed(0)}`} color={C.red} />
              <StatBox label="WIN/LOSS RATIO" value={stats.rr.toFixed(2)} color={stats.rr >= 1.5 ? C.accent : C.yellow} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {/* R-Multiple per trade */}
              <Panel>
                <SectionHeader title="R-MULTIPLE BY TRADE" />
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={tw.filter(t => t.rMultiple !== null).map(t => ({ s: t.symbol, r: parseFloat((t.rMultiple || 0).toFixed(2)) }))}>
                    <CartesianGrid strokeDasharray="2 4" stroke={C.border} />
                    <XAxis dataKey="s" tick={{ fill: C.textMuted, fontSize: 8 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: C.textMuted, fontSize: 8 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}R`} />
                    <Tooltip contentStyle={{ background: C.panel2, border: `1px solid ${C.borderBright}`, fontSize: 10 }} formatter={v => [`${v}R`, "R"]} />
                    <ReferenceLine y={0} stroke={C.textMuted} />
                    <Bar dataKey="r" radius={[2, 2, 0, 0]}>
                      {tw.filter(t => t.rMultiple !== null).map((t, i) => <Cell key={i} fill={t.rMultiple >= 0 ? C.accent : C.red} fillOpacity={0.8} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Panel>

              {/* MAE vs MFE */}
              <Panel>
                <SectionHeader title="MAE vs MFE (EXCURSION)" />
                <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 8 }}>Max Adverse vs Max Favorable per trade</div>
                {maeVsMfe.map((t, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.textDim, marginBottom: 3 }}>
                      <span>{t.symbol}</span>
                      <span style={{ color: t.win ? C.accent : C.red }}>{t.win ? "WIN" : "LOSS"}</span>
                    </div>
                    <div style={{ display: "flex", gap: 2, height: 6 }}>
                      <div style={{ background: C.red, borderRadius: "2px 0 0 2px", width: `${Math.min((t.mae / (t.mae + t.mfe + 0.01)) * 100, 100)}%`, opacity: 0.7 }} />
                      <div style={{ background: C.accent, borderRadius: "0 2px 2px 0", flex: 1, opacity: 0.7 }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: C.textMuted, marginTop: 2 }}>
                      <span style={{ color: C.red }}>MAE: {t.mae}</span>
                      <span style={{ color: C.accent }}>MFE: {t.mfe}</span>
                    </div>
                  </div>
                ))}
              </Panel>

              {/* Long vs Short */}
              <Panel>
                <SectionHeader title="LONG vs SHORT" />
                {["Long", "Short"].map(dir => {
                  const dt = tw.filter(t => t.direction === dir);
                  const pnl = dt.reduce((s, t) => s + t.pnl, 0);
                  const wr = dt.length ? (dt.filter(t => t.win).length / dt.length * 100) : 0;
                  const avgR = dt.length ? dt.filter(t => t.rMultiple != null).reduce((s, t) => s + t.rMultiple, 0) / (dt.filter(t => t.rMultiple != null).length || 1) : 0;
                  return (
                    <div key={dir} style={{ padding: "14px", background: "#ffffff05", marginBottom: 10, borderLeft: `3px solid ${dir === "Long" ? C.accent : C.red}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, color: dir === "Long" ? C.accent : C.red }}>{dir === "Long" ? "▲ LONG" : "▼ SHORT"}</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: pnl >= 0 ? C.accent : C.red }}>{fmt(pnl, 0)}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                        {[["TRADES", dt.length], ["WIN RATE", `${wr.toFixed(0)}%`], ["AVG R", `${avgR.toFixed(2)}R`]].map(([l, v]) => (
                          <div key={l} style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 8, color: C.textMuted }}>{l}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </Panel>
            </div>

            {/* Grade + Best/Worst */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Panel>
                <SectionHeader title="TRADE GRADES" />
                {GRADES.filter(g => tw.some(t => t.grade === g)).map(g => {
                  const gt = tw.filter(t => t.grade === g);
                  const pnl = gt.reduce((s, t) => s + t.pnl, 0);
                  return (
                    <div key={g} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <Pill color={g.startsWith("A") ? C.accent : g.startsWith("B") ? C.blue : C.red}>{g}</Pill>
                      <div style={{ flex: 1, height: 3, background: C.border }}>
                        <div style={{ width: `${(gt.length / tw.length) * 100}%`, height: "100%", background: g.startsWith("A") ? C.accent : g.startsWith("B") ? C.blue : C.red }} />
                      </div>
                      <span style={{ fontSize: 9, color: C.textMuted, width: 20 }}>{gt.length}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: pnl >= 0 ? C.accent : C.red, width: 55, textAlign: "right" }}>{fmt(pnl, 0)}</span>
                    </div>
                  );
                })}
              </Panel>
              <Panel>
                <SectionHeader title="MARKET CONDITIONS" />
                {(() => {
                  const m = {};
                  tw.forEach(t => { const c = t.marketCondition || "Unknown"; if (!m[c]) m[c] = { wins: 0, total: 0, pnl: 0 }; m[c].total++; if (t.win) m[c].wins++; m[c].pnl += t.pnl; });
                  return Object.entries(m).map(([cond, v]) => (
                    <div key={cond} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
                        <span style={{ color: C.textDim }}>{cond}</span>
                        <span style={{ color: v.pnl >= 0 ? C.accent : C.red }}>{v.pnl >= 0 ? "+" : ""}${Math.abs(v.pnl).toFixed(0)}</span>
                      </div>
                      <div style={{ height: 3, background: C.border }}>
                        <div style={{ width: `${v.wins / v.total * 100}%`, height: "100%", background: (v.wins / v.total) >= 0.5 ? C.accent : C.red }} />
                      </div>
                    </div>
                  ));
                })()}
              </Panel>
              <Panel>
                <SectionHeader title="KEY EXTREMES" />
                {stats.bestTrade && (
                  <div style={{ padding: "12px", background: C.accentDim, border: `1px solid ${C.accent}20`, marginBottom: 10 }}>
                    <div style={{ fontSize: 8, color: C.accent, letterSpacing: "0.1em", marginBottom: 4 }}>BEST TRADE</div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div><div style={{ fontSize: 16, fontWeight: 700 }}>{stats.bestTrade.symbol}</div><div style={{ fontSize: 9, color: C.textMuted }}>{stats.bestTrade.date} · {stats.bestTrade.setup}</div></div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.accent }}>{fmt(stats.bestTrade.pnl, 0)}</div>
                    </div>
                  </div>
                )}
                {stats.worstTrade && (
                  <div style={{ padding: "12px", background: C.redDim, border: `1px solid ${C.red}20` }}>
                    <div style={{ fontSize: 8, color: C.red, letterSpacing: "0.1em", marginBottom: 4 }}>WORST TRADE</div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div><div style={{ fontSize: 16, fontWeight: 700 }}>{stats.worstTrade.symbol}</div><div style={{ fontSize: 9, color: C.textMuted }}>{stats.worstTrade.date} · {stats.worstTrade.setup}</div></div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.red }}>{fmt(stats.worstTrade.pnl, 0)}</div>
                    </div>
                  </div>
                )}
              </Panel>
            </div>
          </div>
        )}

        {/* ════════════════════════════════ PSYCHOLOGY ════════════════════════════════ */}
        {tab === "psychology" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <StatBox label="RULE ADHERENCE" value={`${stats.ruleAdherence.toFixed(0)}%`} color={stats.ruleAdherence >= 85 ? C.accent : C.yellow} glow />
              <StatBox label="CLEAN TRADES" value={tw.filter(t => !t.violations?.length).length} sub={`of ${tw.length} total`} color={C.accent} />
              <StatBox label="AVG CONFIDENCE" value={`${stats.avgConfidence.toFixed(1)}/10`} color={C.blue} />
              <StatBox label="VIOLATION TRADES" value={tw.filter(t => t.violations?.length > 0).length} color={C.red} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {/* Emotion Performance */}
              <Panel>
                <SectionHeader title="EMOTION → PERFORMANCE" />
                {emotionBreakdown.map(e => (
                  <div key={e.emotion} style={{ marginBottom: 10, padding: "8px 10px", background: "#ffffff04", borderLeft: `2px solid ${parseInt(e.winRate) >= 60 ? C.accent : parseInt(e.winRate) >= 40 ? C.yellow : C.red}40` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11 }}>{e.emotion}</span>
                      <div style={{ display: "flex", gap: 10 }}>
                        <span style={{ fontSize: 9, color: C.textMuted }}>{e.total} trades</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: e.pnl >= 0 ? C.accent : C.red }}>{fmt(e.pnl, 0)}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 3, background: C.border }}>
                        <div style={{ width: `${e.winRate}%`, height: "100%", background: parseInt(e.winRate) >= 60 ? C.accent : parseInt(e.winRate) >= 40 ? C.yellow : C.red }} />
                      </div>
                      <span style={{ fontSize: 9, color: C.textMuted, width: 28 }}>{e.winRate}%</span>
                    </div>
                  </div>
                ))}
              </Panel>

              {/* Rule Violations */}
              <Panel>
                <SectionHeader title="RULE VIOLATIONS TRACKER" />
                {violationStats.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: C.accent }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
                    <div style={{ fontSize: 11 }}>No rule violations logged</div>
                    <div style={{ fontSize: 9, color: C.textMuted, marginTop: 4 }}>Excellent discipline!</div>
                  </div>
                ) : violationStats.map(v => (
                  <div key={v.violation} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
                        <span style={{ color: C.textDim }}>{v.violation}</span>
                        <span style={{ color: v.pnl >= 0 ? C.yellow : C.red }}>{fmt(v.pnl, 0)}</span>
                      </div>
                      <div style={{ height: 3, background: C.border }}>
                        <div style={{ width: `${(v.count / Math.max(...violationStats.map(x => x.count))) * 100}%`, height: "100%", background: C.red, opacity: 0.7 }} />
                      </div>
                    </div>
                    <div style={{ background: C.redDim, color: C.red, padding: "2px 7px", fontSize: 11, fontWeight: 700, minWidth: 24, textAlign: "center" }}>{v.count}</div>
                  </div>
                ))}
              </Panel>
            </div>

            {/* Confidence vs P&L */}
            <Panel>
              <SectionHeader title="PRE-TRADE CONFIDENCE vs OUTCOME" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 6 }}>
                {Array.from({ length: 10 }, (_, i) => {
                  const conf = i + 1;
                  const confTrades = tw.filter(t => t.preTradeConfidence === conf);
                  const pnl = confTrades.reduce((s, t) => s + t.pnl, 0);
                  const wr = confTrades.length ? (confTrades.filter(t => t.win).length / confTrades.length * 100) : 0;
                  return (
                    <div key={conf} style={{ textAlign: "center", padding: "12px 6px", background: "#ffffff05", border: `1px solid ${confTrades.length > 0 ? (pnl >= 0 ? C.accent + "30" : C.red + "30") : C.border}` }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: confTrades.length > 0 ? (pnl >= 0 ? C.accent : C.red) : C.textMuted }}>{conf}</div>
                      <div style={{ fontSize: 8, color: C.textMuted, margin: "4px 0" }}>{confTrades.length}T</div>
                      {confTrades.length > 0 && <div style={{ fontSize: 9, color: pnl >= 0 ? C.accent : C.red }}>{wr.toFixed(0)}% WR</div>}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 9, color: C.textMuted, marginTop: 8, textAlign: "center" }}>Confidence scale 1–10. Log pre-trade confidence when entering trades to see patterns.</div>
            </Panel>
          </div>
        )}

        {/* ════════════════════════════════ PLAYBOOK ════════════════════════════════ */}
        {tab === "playbook" && (
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: "0.15em" }}>{plans.length} DAY PLANS</div>
                <button className="btn-p" onClick={() => setModal("plan")} style={{ padding: "8px 14px", fontSize: 10, letterSpacing: "0.1em" }}>+ PLAN TODAY</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[...plans].reverse().map(p => (
                  <Panel key={p.id} style={{ cursor: "pointer", transition: "border-color .2s", borderColor: selectedPlan?.id === p.id ? C.accent + "44" : C.border }}
                    onClick={() => setSelectedPlan(selectedPlan?.id === p.id ? null : p)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700 }}>{p.date}</div>
                          <Pill color={p.bias === "Bullish" ? C.accent : p.bias === "Bearish" ? C.red : C.yellow}>{p.bias}</Pill>
                          <Pill color={C.blue}>{p.marketCondition}</Pill>
                        </div>
                        <div style={{ fontSize: 10, color: C.textDim, marginBottom: 4 }}><span style={{ color: C.textMuted }}>LEVELS: </span>{p.keyLevels}</div>
                        <div style={{ fontSize: 10, color: C.textDim }}><span style={{ color: C.textMuted }}>WATCH: </span>{p.watchlist}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                        <div style={{ fontSize: 9, color: C.textMuted }}>MAX LOSS</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.red }}>${p.maxLoss}</div>
                        <div style={{ fontSize: 9, color: C.textMuted, marginTop: 4 }}>Energy: {p.energyScore}/10</div>
                      </div>
                    </div>
                    {p.notes && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>{p.notes}</div>}
                  </Panel>
                ))}
                {plans.length === 0 && (
                  <div style={{ textAlign: "center", padding: "60px 0", color: C.textMuted }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                    <div style={{ fontSize: 12 }}>No day plans yet</div>
                    <div style={{ fontSize: 10, marginTop: 4 }}>Start each day with a plan</div>
                  </div>
                )}
              </div>
            </div>
            {selectedPlan && (
              <div style={{ width: 300, flexShrink: 0 }} className="fade-in">
                <Panel>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{selectedPlan.date}</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                    <Pill color={selectedPlan.bias === "Bullish" ? C.accent : selectedPlan.bias === "Bearish" ? C.red : C.yellow}>{selectedPlan.bias}</Pill>
                    <Pill color={C.blue}>{selectedPlan.marketCondition}</Pill>
                  </div>
                  {[["KEY LEVELS", selectedPlan.keyLevels], ["WATCHLIST", selectedPlan.watchlist], ["TARGETS", selectedPlan.targets], ["NOTES", selectedPlan.notes]].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 8, color: C.textMuted, letterSpacing: "0.12em", marginBottom: 4 }}>{k}</div>
                      <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.7 }}>{v}</div>
                    </div>
                  ))}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                    <div style={{ background: C.redDim, border: `1px solid ${C.red}20`, padding: "10px", textAlign: "center" }}>
                      <div style={{ fontSize: 8, color: C.textMuted }}>MAX LOSS</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.red }}>${selectedPlan.maxLoss}</div>
                    </div>
                    <div style={{ background: C.accentDim, border: `1px solid ${C.accent}20`, padding: "10px", textAlign: "center" }}>
                      <div style={{ fontSize: 8, color: C.textMuted }}>ENERGY</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.accent }}>{selectedPlan.energyScore}/10</div>
                    </div>
                  </div>
                  <button className="btn-g" onClick={() => deletePlan(selectedPlan.id)} style={{ width: "100%", padding: "8px", fontSize: 10, marginTop: 12, color: C.red, borderColor: C.red + "44" }}>DELETE PLAN</button>
                </Panel>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════ RISK ════════════════════════════════ */}
        {tab === "risk" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <StatBox label="ACCOUNT SIZE" value={`$${accountSize.toLocaleString()}`} />
              <StatBox label="DAILY MAX LOSS" value={`$${dailyMaxLoss}`} color={C.red} />
              <StatBox label="RISK PER TRADE" value={`${riskPerTrade}%`} color={C.yellow} />
              <StatBox label="MAX DRAWDOWN" value={`$${stats.maxDD.toFixed(0)}`} color={C.red} />
            </div>

            {/* Settings */}
            <Panel>
              <SectionHeader title="RISK SETTINGS" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {[["Account Size ($)", accountSize, setAccountSize, "number"], ["Daily Max Loss ($)", dailyMaxLoss, setDailyMaxLoss, "number"], ["Default Risk % per Trade", riskPerTrade, setRiskPerTrade, "number"]].map(([label, val, setter, type]) => (
                  <div key={label}>
                    <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 4 }}>{label.toUpperCase()}</div>
                    <input className="inp" type={type} value={val} onChange={e => setter(parseFloat(e.target.value) || 0)} step={label.includes("%") ? "0.1" : "100"} />
                  </div>
                ))}
              </div>
            </Panel>

            {/* Position Size Calculator */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Panel>
                <SectionHeader title="POSITION SIZE CALCULATOR" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  {[["Entry Price", "entry"], ["Stop Loss Price", "stop"]].map(([label, key]) => (
                    <div key={key}>
                      <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 4 }}>{label.toUpperCase()}</div>
                      <input className="inp" type="number" value={posCalc[key]} onChange={e => setPosCalc(p => ({ ...p, [key]: e.target.value }))} placeholder="0.00" />
                    </div>
                  ))}
                  <div>
                    <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 4 }}>RISK % (BLANK = DEFAULT)</div>
                    <input className="inp" type="number" value={posCalc.risk} onChange={e => setPosCalc(p => ({ ...p, risk: e.target.value }))} placeholder={`${riskPerTrade}%`} step="0.1" />
                  </div>
                </div>
                {posResult ? (
                  <div style={{ background: C.accentDim, border: `1px solid ${C.accent}30`, padding: 16 }}>
                    <div style={{ fontSize: 9, color: C.accent, letterSpacing: "0.12em", marginBottom: 12 }}>POSITION SIZING RESULT</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {[["SHARES/CONTRACTS", posResult.shares], ["RISK AMOUNT", `$${posResult.riskAmt.toFixed(2)}`], ["RISK PER SHARE", `$${posResult.riskPerShare.toFixed(4)}`], ["TOTAL POSITION", `$${posResult.totalValue.toFixed(2)}`]].map(([l, v]) => (
                        <div key={l} style={{ textAlign: "center", padding: "10px", background: "#00000020" }}>
                          <div style={{ fontSize: 8, color: C.textMuted }}>{l}</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: C.accent, marginTop: 2 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "30px 0", color: C.textMuted, fontSize: 11 }}>Enter entry and stop prices to calculate position size</div>
                )}
              </Panel>

              <Panel>
                <SectionHeader title="DAILY LOSS MONITOR" />
                {pnlByDay.slice(-7).map(d => {
                  const pct = Math.abs(Math.min(d.pnl, 0)) / dailyMaxLoss * 100;
                  return (
                    <div key={d.date} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
                        <span style={{ color: C.textDim }}>{d.date}</span>
                        <span style={{ fontWeight: 600, color: d.pnl >= 0 ? C.accent : C.red }}>{fmt(d.pnl, 0)}</span>
                      </div>
                      <div style={{ height: 4, background: C.border }}>
                        <div style={{ width: `${Math.min(d.pnl >= 0 ? (d.pnl / dailyMaxLoss * 100) : pct, 100)}%`, height: "100%", background: d.pnl >= 0 ? C.accent : pct >= 80 ? C.red : C.yellow, transition: "width .4s" }} />
                      </div>
                      {d.pnl < 0 && pct >= 80 && <div style={{ fontSize: 8, color: C.red, marginTop: 2 }}>⚠ {pct.toFixed(0)}% of daily limit</div>}
                    </div>
                  );
                })}
                <div style={{ marginTop: 14, padding: "12px", background: "#ffffff05", fontSize: 10, color: C.textDim, lineHeight: 1.7 }}>
                  <div style={{ fontWeight: 600, color: C.yellow, marginBottom: 4 }}>💡 RISK RULES</div>
                  <div>• Stop trading at ${dailyMaxLoss} daily loss</div>
                  <div>• Max {riskPerTrade}% account risk per trade</div>
                  <div>• Size down after 2 consecutive losses</div>
                  <div>• No revenge trading after max loss hit</div>
                </div>
              </Panel>
            </div>
          </div>
        )}

        {/* ════════════════════════════════ CALENDAR ════════════════════════════════ */}
        {tab === "calendar" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Panel>
              <SectionHeader title="MARCH 2025 — TRADE CALENDAR" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                {["MON","TUE","WED","THU","FRI","SAT","SUN"].map(d => (
                  <div key={d} style={{ textAlign: "center", fontSize: 8, color: C.textMuted, padding: "6px 0", letterSpacing: "0.1em" }}>{d}</div>
                ))}
                {Array.from({ length: 5 }, (_, i) => <div key={`p${i}`} style={{ height: 72 }} />)}
                {Array.from({ length: 31 }, (_, i) => {
                  const day = i + 1;
                  const dateStr = `2025-03-${String(day).padStart(2, "0")}`;
                  const dayTrades = tw.filter(t => t.date === dateStr);
                  const dayPnl = dayTrades.reduce((s, t) => s + t.pnl, 0);
                  const hasPlan = plans.some(p => p.date === dateStr);
                  const intensity = dayTrades.length ? Math.min(Math.abs(dayPnl) / 200, 1) : 0;
                  return (
                    <div key={day} style={{ height: 72, background: dayTrades.length ? (dayPnl >= 0 ? `rgba(0,229,176,${0.05 + intensity * 0.2})` : `rgba(255,61,90,${0.05 + intensity * 0.2})`) : "#ffffff04", border: `1px solid ${dayTrades.length ? (dayPnl >= 0 ? C.accent + "40" : C.red + "40") : C.border}`, padding: "6px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: dayTrades.length ? C.text : C.textMuted }}>{day}</span>
                        {hasPlan && <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.yellow, flexShrink: 0 }} title="Has plan" />}
                      </div>
                      {dayTrades.length > 0 && (
                        <>
                          <div style={{ fontSize: 9, fontWeight: 700, color: dayPnl >= 0 ? C.accent : C.red }}>{dayPnl >= 0 ? "+" : ""}${Math.abs(dayPnl).toFixed(0)}</div>
                          <div style={{ fontSize: 8, color: C.textMuted }}>{dayTrades.length} trade{dayTrades.length > 1 ? "s" : ""}</div>
                          <div style={{ fontSize: 8, color: C.textMuted }}>{(dayTrades.filter(t => t.win).length / dayTrades.length * 100).toFixed(0)}% WR</div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 20, marginTop: 12, fontSize: 9, color: C.textMuted }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 8, height: 8, background: C.accent + "60" }} /> Profit day</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 8, height: 8, background: C.red + "60" }} /> Loss day</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: C.yellow }} /> Day plan exists</div>
              </div>
            </Panel>
          </div>
        )}

      </div>

      {/* ════════════════════ MODALS ════════════════════ */}
      {modal === "trade" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, width: 740, maxHeight: "92vh", overflowY: "auto", padding: 28 }} className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800 }}>LOG NEW TRADE</div>
                <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>Record every detail for better analysis</div>
              </div>
              <button className="btn-g" onClick={() => setModal(null)} style={{ padding: "5px 11px", fontSize: 13 }}>✕</button>
            </div>

            <div style={{ fontSize: 9, color: C.accent, letterSpacing: "0.15em", marginBottom: 10 }}>▸ TRADE DETAILS</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
              {[["Date", "date", "date"], ["Symbol", "symbol", "text"], ["Asset Type", "assetType", "sel", ASSET_TYPES], ["Direction", "direction", "sel", DIRECTIONS], ["Entry Price", "entryPrice", "number"], ["Exit Price", "exitPrice", "number"], ["Quantity", "qty", "number"], ["Commission", "commission", "number"], ["Stop Loss", "stopLoss", "number"], ["Take Profit", "takeProfit", "number"], ["MAE", "mae", "number"], ["MFE", "mfe", "number"]].map(([l, k, t, opts]) => (
                <div key={k}>
                  <div style={{ fontSize: 8, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 4 }}>{l.toUpperCase()}</div>
                  {t === "sel" ? <select className="inp" value={tradeForm[k]} onChange={e => tf(k, e.target.value)}>{opts.map(o => <option key={o}>{o}</option>)}</select>
                    : <input className="inp" type={t} value={tradeForm[k]} onChange={e => tf(k, e.target.value)} step="any" />}
                </div>
              ))}
            </div>

            <div style={{ fontSize: 9, color: C.accent, letterSpacing: "0.15em", marginBottom: 10 }}>▸ CONTEXT & PSYCHOLOGY</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
              {[["Setup", "setup", "sel", SETUPS], ["Session", "session", "sel", SESSIONS], ["Market Condition", "marketCondition", "sel", MARKET_CONDITIONS], ["Emotion", "emotion", "sel", EMOTIONS], ["Grade", "grade", "sel", GRADES], ["Entry Time", "entryTime", "time"], ["Exit Time", "exitTime", "time"], ["Pre-Trade Confidence (1-10)", "preTradeConfidence", "number"]].map(([l, k, t, opts]) => (
                <div key={k}>
                  <div style={{ fontSize: 8, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 4 }}>{l.toUpperCase()}</div>
                  {t === "sel" ? <select className="inp" value={tradeForm[k]} onChange={e => tf(k, e.target.value)}>{opts.map(o => <option key={o}>{o}</option>)}</select>
                    : <input className="inp" type={t} value={tradeForm[k]} onChange={e => tf(k, e.target.value)} min={k === "preTradeConfidence" ? 1 : undefined} max={k === "preTradeConfidence" ? 10 : undefined} />}
                </div>
              ))}
            </div>

            <div style={{ fontSize: 9, color: C.accent, letterSpacing: "0.15em", marginBottom: 10 }}>▸ RULE VIOLATIONS (check all that apply)</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginBottom: 16, padding: "12px", background: "#ffffff04", border: `1px solid ${C.border}` }}>
              {RULE_VIOLATIONS.map(v => (
                <label key={v} className="chk">
                  <input type="checkbox" checked={tradeForm.violations.includes(v)}
                    onChange={e => tf("violations", e.target.checked ? [...tradeForm.violations, v] : tradeForm.violations.filter(x => x !== v))} />
                  <span style={{ fontSize: 9, color: C.textDim }}>{v}</span>
                </label>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 8, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 4 }}>TAGS (comma separated)</div>
                <input className="inp" placeholder="earnings, tech, momentum..." value={tradeForm.tags} onChange={e => tf("tags", e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: 8, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 4 }}>MARKET</div>
                <input className="inp" value={tradeForm.market} onChange={e => tf("market", e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 8, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 4 }}>TRADE NOTES — Thesis, execution, what happened</div>
              <textarea className="inp" rows={2} value={tradeForm.notes} onChange={e => tf("notes", e.target.value)} style={{ resize: "vertical" }} placeholder="What was your thesis? How did execution feel?" />
            </div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 8, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 4 }}>POST-TRADE REVIEW — What did you learn?</div>
              <textarea className="inp" rows={2} value={tradeForm.postReview} onChange={e => tf("postReview", e.target.value)} style={{ resize: "vertical" }} placeholder="What went well? What to improve? What did you learn?" />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-p" onClick={saveTrade} style={{ flex: 1, padding: "12px", fontSize: 12, letterSpacing: "0.1em" }}>LOG TRADE</button>
              <button className="btn-g" onClick={() => setModal(null)} style={{ padding: "12px 20px", fontSize: 11 }}>CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {modal === "plan" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, width: 600, maxHeight: "90vh", overflowY: "auto", padding: 28 }} className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800 }}>DAY PLAN</div>
                <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>Define your edge before the market opens</div>
              </div>
              <button className="btn-g" onClick={() => setModal(null)} style={{ padding: "5px 11px", fontSize: 13 }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
              {[["Date", "date", "date"], ["Market Bias", "bias", "sel", ["Bullish", "Bearish", "Neutral"]], ["Market Condition", "marketCondition", "sel", MARKET_CONDITIONS], ["Max Loss Today ($)", "maxLoss", "number"], ["Energy Score (1-10)", "energyScore", "number"]].map(([l, k, t, opts]) => (
                <div key={k}>
                  <div style={{ fontSize: 8, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 4 }}>{l.toUpperCase()}</div>
                  {t === "sel" ? <select className="inp" value={planForm[k]} onChange={e => setPlanForm(f => ({ ...f, [k]: e.target.value }))}>{opts.map(o => <option key={o}>{o}</option>)}</select>
                    : <input className="inp" type={t} value={planForm[k]} onChange={e => setPlanForm(f => ({ ...f, [k]: e.target.value }))} />}
                </div>
              ))}
            </div>

            {[["KEY LEVELS — Support, resistance, pivots", "keyLevels", "text", 1], ["WATCHLIST — Symbols to watch", "watchlist", "text", 1], ["TRADE TARGETS — What setups are you looking for?", "targets", "textarea", 2], ["NOTES — News, catalysts, conditions to avoid", "notes", "textarea", 2]].map(([l, k, t, rows]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 8, color: C.textMuted, letterSpacing: "0.1em", marginBottom: 4 }}>{l.toUpperCase()}</div>
                {t === "textarea" ? <textarea className="inp" rows={rows} value={planForm[k]} onChange={e => setPlanForm(f => ({ ...f, [k]: e.target.value }))} style={{ resize: "vertical" }} />
                  : <input className="inp" value={planForm[k]} onChange={e => setPlanForm(f => ({ ...f, [k]: e.target.value }))} />}
              </div>
            ))}

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button className="btn-p" onClick={savePlan} style={{ flex: 1, padding: "12px", fontSize: 12, letterSpacing: "0.1em" }}>SAVE PLAN</button>
              <button className="btn-g" onClick={() => setModal(null)} style={{ padding: "12px 20px", fontSize: 11 }}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
