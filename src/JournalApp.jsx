import { useState, useMemo, useEffect, useRef } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine,
} from 'recharts'
import { DB } from './db.js'
import {
  C, PIE_COLORS, SAMPLE_TRADES,
  ASSET_TYPES, SETUPS, EMOTIONS, GRADES,
  SESSIONS, RULE_VIOLATIONS, MARKET_CONDITIONS,
} from './constants.js'
import {
  calcPnL, calcR, calcExpectancy, calcSharpe,
  fmt, fmtN, Pill, StatBox, Panel, SectionHeader, ChartTooltip,
} from './utils.jsx'

export default function JournalApp({ user, onSignOut }) {
  const [trades, setTrades] = useState([])
  const [plans, setPlans] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState('dashboard')
  const [modal, setModal] = useState(null)
  const [selectedTrade, setSelectedTrade] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [filterAsset, setFilterAsset] = useState('All')
  const [filterDir, setFilterDir] = useState('All')
  const [searchQ, setSearchQ] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [sortAsc, setSortAsc] = useState(false)
  const [accountSize, setAccountSize] = useState(50000)
  const [dailyMaxLoss, setDailyMaxLoss] = useState(500)
  const [riskPerTrade, setRiskPerTrade] = useState(1.0)
  const [posCalc, setPosCalc] = useState({ entry: '', stop: '', risk: '' })
  const [showUserMenu, setShowUserMenu] = useState(false)
  const saveTimer = useRef(null)

  // Load user data
  useEffect(() => {
    const t = DB.getTrades(user.username)
    const p = DB.getPlans(user.username)
    const s = DB.getSettings(user.username)
    setTrades(t !== null ? t : SAMPLE_TRADES)
    setPlans(p || [])
    if (s) {
      setAccountSize(s.accountSize || 50000)
      setDailyMaxLoss(s.dailyMaxLoss || 500)
      setRiskPerTrade(s.riskPerTrade || 1.0)
    }
    setLoaded(true)
  }, [user.username])

  // Auto-save
  useEffect(() => {
    if (!loaded) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => DB.saveTrades(user.username, trades), 400)
  }, [trades, loaded])
  useEffect(() => { if (loaded) DB.savePlans(user.username, plans) }, [plans, loaded])
  useEffect(() => {
    if (loaded) DB.saveSettings(user.username, { accountSize, dailyMaxLoss, riskPerTrade })
  }, [accountSize, dailyMaxLoss, riskPerTrade, loaded])

  // ── Derived ──────────────────────────────────────────────────────────────
  const tw = useMemo(
    () => trades.map((t) => ({ ...t, pnl: calcPnL(t), rMultiple: calcR(t), win: calcPnL(t) > 0 })),
    [trades],
  )

  const stats = useMemo(() => {
    if (!tw.length)
      return {
        totalPnL: 0, winRate: 0, totalTrades: 0, wins: 0, losses: 0,
        avgWin: 0, avgLoss: 0, rr: 0, avgR: 0, maxDD: 0,
        profitFactor: 0, expectancy: 0, sharpe: 0,
        bestTrade: null, worstTrade: null,
        streak: { current: 0, type: 'none' },
        ruleAdherence: 100, avgConfidence: 0,
      }
    const wins = tw.filter((x) => x.win)
    const losses = tw.filter((x) => !x.win)
    const totalPnL = tw.reduce((s, x) => s + x.pnl, 0)
    const avgWin = wins.length ? wins.reduce((s, x) => s + x.pnl, 0) / wins.length : 0
    const avgLoss = losses.length ? losses.reduce((s, x) => s + x.pnl, 0) / losses.length : 0
    const rVals = tw.map((x) => x.rMultiple).filter((x) => x !== null)
    const avgR = rVals.length ? rVals.reduce((a, b) => a + b, 0) / rVals.length : 0
    let peak = 0, maxDD = 0, running = 0
    ;[...tw].sort((a, b) => a.date.localeCompare(b.date)).forEach((x) => {
      running += x.pnl
      if (running > peak) peak = running
      const dd = peak - running
      if (dd > maxDD) maxDD = dd
    })
    const profitFactor = losses.length
      ? Math.abs(wins.reduce((s, x) => s + x.pnl, 0) / (losses.reduce((s, x) => s + x.pnl, 0) || 1))
      : 99
    const sorted = [...tw].sort((a, b) => b.date.localeCompare(a.date))
    let streak = 0
    const st = sorted[0]?.win
    for (const t of sorted) { if (t.win === st) streak++; else break }
    const vTrades = tw.filter((t) => t.violations?.length > 0)
    return {
      totalPnL, winRate: (wins.length / tw.length) * 100,
      totalTrades: tw.length, wins: wins.length, losses: losses.length,
      avgWin, avgLoss,
      rr: avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0,
      avgR, maxDD, profitFactor,
      expectancy: calcExpectancy(tw),
      sharpe: calcSharpe(tw),
      bestTrade: tw.reduce((a, b) => (a.pnl > b.pnl ? a : b)),
      worstTrade: tw.reduce((a, b) => (a.pnl < b.pnl ? a : b)),
      streak: { current: streak, type: st ? 'win' : 'loss' },
      ruleAdherence: tw.length ? ((tw.length - vTrades.length) / tw.length) * 100 : 100,
      avgConfidence: tw.length
        ? tw.reduce((s, t) => s + (t.preTradeConfidence || 5), 0) / tw.length
        : 0,
    }
  }, [tw])

  const equityCurve = useMemo(() => {
    let c = 0
    return [...tw]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((t, i) => { c += t.pnl; return { n: i + 1, pnl: parseFloat(c.toFixed(2)), date: t.date.slice(5) } })
  }, [tw])

  const pnlByDay = useMemo(() => {
    const m = {}
    tw.forEach((t) => { m[t.date] = (m[t.date] || 0) + t.pnl })
    return Object.entries(m)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([d, pnl]) => ({ date: d.slice(5), pnl: parseFloat(pnl.toFixed(2)) }))
  }, [tw])

  const todayStr = new Date().toISOString().split('T')[0]
  const todayPnL = useMemo(() => tw.filter((t) => t.date === todayStr).reduce((s, t) => s + t.pnl, 0), [tw])
  const todayTrades = useMemo(() => tw.filter((t) => t.date === todayStr), [tw])

  const setupBreakdown = useMemo(() => {
    const m = {}
    tw.forEach((t) => {
      if (!m[t.setup]) m[t.setup] = { wins: 0, total: 0, pnl: 0, rSum: 0, rCount: 0 }
      m[t.setup].total++
      if (t.win) m[t.setup].wins++
      m[t.setup].pnl += t.pnl
      if (t.rMultiple != null) { m[t.setup].rSum += t.rMultiple; m[t.setup].rCount++ }
    })
    return Object.entries(m)
      .map(([setup, v]) => ({
        setup, ...v,
        winRate: ((v.wins / v.total) * 100).toFixed(0),
        avgR: v.rCount ? (v.rSum / v.rCount).toFixed(2) : '—',
      }))
      .sort((a, b) => b.pnl - a.pnl)
  }, [tw])

  const sessionBreakdown = useMemo(() => {
    const m = {}
    tw.forEach((t) => {
      const s = t.session || 'Unknown'
      if (!m[s]) m[s] = { wins: 0, total: 0, pnl: 0 }
      m[s].total++; if (t.win) m[s].wins++; m[s].pnl += t.pnl
    })
    return Object.entries(m)
      .map(([session, v]) => ({ session, ...v, winRate: ((v.wins / v.total) * 100).toFixed(0) }))
      .sort((a, b) => b.pnl - a.pnl)
  }, [tw])

  const emotionBreakdown = useMemo(() => {
    const m = {}
    tw.forEach((t) => {
      if (!m[t.emotion]) m[t.emotion] = { wins: 0, total: 0, pnl: 0 }
      m[t.emotion].total++; if (t.win) m[t.emotion].wins++; m[t.emotion].pnl += t.pnl
    })
    return Object.entries(m)
      .map(([emotion, v]) => ({ emotion, ...v, winRate: ((v.wins / v.total) * 100).toFixed(0) }))
      .sort((a, b) => b.pnl - a.pnl)
  }, [tw])

  const violationStats = useMemo(() => {
    const m = {}
    tw.forEach((t) => (t.violations || []).forEach((v) => {
      if (!m[v]) m[v] = { count: 0, pnl: 0 }
      m[v].count++; m[v].pnl += t.pnl
    }))
    return Object.entries(m).map(([v, d]) => ({ violation: v, ...d })).sort((a, b) => b.count - a.count)
  }, [tw])

  const filteredTrades = useMemo(() => {
    let t = [...tw]
    if (filterAsset !== 'All') t = t.filter((x) => x.assetType === filterAsset)
    if (filterDir !== 'All') t = t.filter((x) => x.direction === filterDir)
    if (searchQ)
      t = t.filter((x) =>
        [x.symbol, x.setup, x.notes, ...(x.tags || [])].join(' ').toLowerCase().includes(searchQ.toLowerCase()),
      )
    t.sort((a, b) => {
      const va = a[sortBy], vb = b[sortBy]
      return typeof va === 'string'
        ? sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)
        : sortAsc ? va - vb : vb - va
    })
    return t
  }, [tw, filterAsset, filterDir, searchQ, sortBy, sortAsc])

  const posResult = useMemo(() => {
    const e = parseFloat(posCalc.entry), s = parseFloat(posCalc.stop)
    const r = parseFloat(posCalc.risk) || riskPerTrade
    if (!e || !s || e === s) return null
    const riskAmt = accountSize * (r / 100)
    const riskPerShare = Math.abs(e - s)
    const shares = Math.floor(riskAmt / riskPerShare)
    return { shares, riskAmt, riskPerShare, totalValue: shares * e }
  }, [posCalc, accountSize, riskPerTrade])

  const assetPieData = useMemo(() => {
    const m = {}
    tw.forEach((t) => { m[t.assetType] = (m[t.assetType] || 0) + 1 })
    return Object.entries(m).map(([name, value]) => ({ name, value }))
  }, [tw])

  // ── Trade form ────────────────────────────────────────────────────────────
  const emptyTrade = {
    date: todayStr, symbol: '', assetType: 'Stock', direction: 'Long',
    entryPrice: '', exitPrice: '', qty: '', commission: '',
    setup: 'Breakout', emotion: 'Calm & Focused', grade: 'B',
    notes: '', tags: '', market: 'NASDAQ',
    entryTime: '', exitTime: '', stopLoss: '', takeProfit: '',
    mae: '', mfe: '', violations: [],
    session: 'Market Open (9:30-10:30)', marketCondition: 'Trending Up',
    riskPercent: riskPerTrade, preTradeConfidence: 7, postReview: '',
  }
  const [tradeForm, setTradeForm] = useState(emptyTrade)
  const tf = (k, v) => setTradeForm((f) => ({ ...f, [k]: v }))

  const emptyPlan = {
    date: todayStr, bias: 'Neutral', keyLevels: '', watchlist: '',
    maxLoss: dailyMaxLoss, targets: '', energyScore: 7, notes: '',
    marketCondition: 'Range Bound',
  }
  const [planForm, setPlanForm] = useState(emptyPlan)
  const pf = (k, v) => setPlanForm((f) => ({ ...f, [k]: v }))

  function saveTrade() {
    const t = {
      ...tradeForm, id: Date.now(),
      entryPrice: parseFloat(tradeForm.entryPrice),
      exitPrice: parseFloat(tradeForm.exitPrice),
      qty: parseFloat(tradeForm.qty),
      commission: parseFloat(tradeForm.commission || 0),
      stopLoss: parseFloat(tradeForm.stopLoss || 0),
      takeProfit: parseFloat(tradeForm.takeProfit || 0),
      mae: parseFloat(tradeForm.mae || 0),
      mfe: parseFloat(tradeForm.mfe || 0),
      preTradeConfidence: parseInt(tradeForm.preTradeConfidence || 7),
      tags: typeof tradeForm.tags === 'string'
        ? tradeForm.tags.split(',').map((s) => s.trim()).filter(Boolean)
        : tradeForm.tags,
    }
    setTrades((prev) => [...prev, t])
    setModal(null)
    setTradeForm(emptyTrade)
  }

  function savePlan() {
    setPlans((prev) => [
      ...prev,
      { ...planForm, id: Date.now(), maxLoss: parseFloat(planForm.maxLoss || 0), energyScore: parseInt(planForm.energyScore || 7) },
    ])
    setModal(null)
    setPlanForm(emptyPlan)
  }

  const TABS = [
    { id: 'dashboard', label: 'DASHBOARD' },
    { id: 'trades', label: 'TRADE LOG' },
    { id: 'analytics', label: 'ANALYTICS' },
    { id: 'psychology', label: 'PSYCHOLOGY' },
    { id: 'playbook', label: 'PLAYBOOK' },
    { id: 'risk', label: 'RISK' },
    { id: 'calendar', label: 'CALENDAR' },
  ]

  const dailyLossWarn = Math.abs(Math.min(todayPnL, 0)) / dailyMaxLoss

  if (!loaded) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted, fontSize: 11, letterSpacing: '0.2em' }}>
      <span className="pulse">LOADING YOUR DATA…</span>
    </div>
  )

  // Helper for select fields
  const Sel = ({ label, field, opts, form, onChange }) => (
    <div>
      <div style={{ fontSize: 8, color: C.textMuted, letterSpacing: '0.1em', marginBottom: 4 }}>{label.toUpperCase()}</div>
      <select className="inp" value={form[field]} onChange={(e) => onChange(field, e.target.value)}>
        {opts.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  )

  const Inp = ({ label, field, type = 'text', form, onChange, ...rest }) => (
    <div>
      <div style={{ fontSize: 8, color: C.textMuted, letterSpacing: '0.1em', marginBottom: 4 }}>{label.toUpperCase()}</div>
      <input className="inp" type={type} value={form[field]} onChange={(e) => onChange(field, e.target.value)} step="any" {...rest} />
    </div>
  )

  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", background: C.bg, minHeight: '100vh', color: C.text }}>
      {/* ── TOP BAR ── */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.panel, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 10 }}>
              <div style={{ width: 26, height: 26, background: C.accentDim, border: `1px solid ${C.accent}44`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 8, height: 8, background: C.accent, borderRadius: '50%', boxShadow: `0 0 8px ${C.accent}` }} />
              </div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: '0.06em' }}>
                EDGE<span style={{ color: C.accent }}>JOURNAL</span>
              </div>
            </div>
            <div style={{ width: 1, height: 24, background: C.border, marginRight: 6 }} />
            {TABS.map((t) => (
              <button key={t.id} className="tab" onClick={() => setTab(t.id)}
                style={{ color: tab === t.id ? C.accent : C.textMuted, borderBottomColor: tab === t.id ? C.accent : 'transparent' }}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {dailyLossWarn > 0.6 && (
              <div style={{ background: '#ff3d5a15', border: '1px solid #ff3d5a30', padding: '4px 10px', fontSize: 9, color: C.red, letterSpacing: '0.1em', borderRadius: 3 }}>
                ⚠ {(dailyLossWarn * 100).toFixed(0)}% DAILY LOSS LIMIT
              </div>
            )}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.1em' }}>TOTAL P&L</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: stats.totalPnL >= 0 ? C.accent : C.red, letterSpacing: '-0.02em' }}>
                {fmt(stats.totalPnL)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-g" onClick={() => { setPlanForm({ ...emptyPlan, date: todayStr }); setModal('plan') }} style={{ padding: '6px 11px', fontSize: 10 }}>+ PLAN DAY</button>
              <button className="btn-p" onClick={() => { setTradeForm(emptyTrade); setModal('trade') }} style={{ padding: '6px 12px', fontSize: 10, letterSpacing: '0.1em' }}>+ LOG TRADE</button>
            </div>

            {/* User menu */}
            <div style={{ position: 'relative' }}>
              <div onClick={() => setShowUserMenu(!showUserMenu)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', padding: '5px 10px', borderRadius: 4, border: `1px solid ${showUserMenu ? C.accent + '44' : C.border}`, background: showUserMenu ? C.accentDim : 'transparent', transition: 'all .15s' }}>
                <div style={{ width: 22, height: 22, background: C.accent, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#000' }}>
                  {(user.displayName || user.username)?.[0]?.toUpperCase()}
                </div>
                <span style={{ fontSize: 10, color: C.textDim }}>{user.displayName || user.username}</span>
                <span style={{ fontSize: 8, color: C.textMuted }}>{showUserMenu ? '▲' : '▼'}</span>
              </div>
              {showUserMenu && (
                <div className="fade-in" style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 4, padding: '6px', minWidth: 160, zIndex: 100, boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
                  <div style={{ padding: '8px 10px 10px', borderBottom: `1px solid ${C.border}`, marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{user.displayName || user.username}</div>
                    <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>{tw.length} trades logged</div>
                  </div>
                  <button onClick={() => { setShowUserMenu(false); onSignOut() }} className="btn-g"
                    style={{ width: '100%', padding: '8px 10px', fontSize: 10, textAlign: 'left', color: C.red, borderColor: 'transparent' }}>
                    ⎋ SIGN OUT
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ padding: '20px' }} className="fade-in" onClick={() => showUserMenu && setShowUserMenu(false)}>

        {/* ════ DASHBOARD ════ */}
        {tab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 8 }}>
              <StatBox label="WIN RATE" value={`${stats.winRate.toFixed(1)}%`} color={stats.winRate >= 50 ? C.accent : C.yellow} glow />
              <StatBox label="NET P&L" value={fmt(stats.totalPnL, 0)} color={stats.totalPnL >= 0 ? C.accent : C.red} glow />
              <StatBox label="EXPECTANCY" value={fmt(stats.expectancy, 0)} sub="per trade" color={stats.expectancy >= 0 ? C.accent : C.red} />
              <StatBox label="PROFIT FACTOR" value={isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞'} color={stats.profitFactor >= 1.5 ? C.accent : C.red} />
              <StatBox label="SHARPE RATIO" value={stats.sharpe.toFixed(2)} color={stats.sharpe >= 1 ? C.accent : stats.sharpe >= 0 ? C.yellow : C.red} />
              <StatBox label="AVG R-MULTIPLE" value={`${stats.avgR.toFixed(2)}R`} color={stats.avgR >= 1 ? C.accent : C.red} />
              <StatBox label="MAX DRAWDOWN" value={`$${stats.maxDD.toFixed(0)}`} color={C.red} />
              <StatBox label="RULE ADHERENCE" value={`${stats.ruleAdherence.toFixed(0)}%`} color={stats.ruleAdherence >= 85 ? C.accent : C.yellow} />
              <StatBox label="STREAK" value={`${stats.streak.current}${stats.streak.type === 'win' ? 'W' : 'L'}`} sub={stats.streak.type === 'win' ? 'winning' : 'losing'} color={stats.streak.type === 'win' ? C.accent : C.red} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 12 }}>
              <Panel>
                <SectionHeader title="EQUITY CURVE" />
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={equityCurve}>
                    <defs><linearGradient id="ec" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.accent} stopOpacity={0.2} /><stop offset="95%" stopColor={C.accent} stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="2 4" stroke={C.border} />
                    <XAxis dataKey="n" tick={{ fill: C.textMuted, fontSize: 8 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: C.textMuted, fontSize: 8 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip content={ChartTooltip} />
                    <ReferenceLine y={0} stroke={C.border} strokeDasharray="4 4" />
                    <Area type="monotone" dataKey="pnl" stroke={C.accent} strokeWidth={2} fill="url(#ec)" dot={false} activeDot={{ r: 4, fill: C.accent, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Panel>
              <Panel>
                <SectionHeader title="DAILY P&L" />
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={pnlByDay}>
                    <CartesianGrid strokeDasharray="2 4" stroke={C.border} />
                    <XAxis dataKey="date" tick={{ fill: C.textMuted, fontSize: 8 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: C.textMuted, fontSize: 8 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip content={ChartTooltip} />
                    <ReferenceLine y={0} stroke={C.border} />
                    <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>{pnlByDay.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? C.accent : C.red} fillOpacity={0.85} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
              <Panel>
                <SectionHeader title="SETUP PERFORMANCE" />
                {setupBreakdown.length === 0 ? <div style={{ color: C.textMuted, fontSize: 11, padding: '20px 0' }}>Log your first trade to see setup stats.</div> :
                  setupBreakdown.slice(0, 7).map((s) => (
                    <div key={s.setup} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 85, fontSize: 9, color: C.textDim, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.setup}</div>
                      <div style={{ flex: 1, height: 3, background: C.border }}><div style={{ width: `${s.winRate}%`, height: '100%', background: parseInt(s.winRate) >= 50 ? C.accent : C.red }} /></div>
                      <div style={{ fontSize: 9, color: C.textMuted, width: 26, textAlign: 'right' }}>{s.winRate}%</div>
                      <div style={{ fontSize: 9, color: C.textMuted, width: 28, textAlign: 'right' }}>{s.avgR}R</div>
                      <div style={{ fontSize: 9, width: 52, textAlign: 'right', color: s.pnl >= 0 ? C.accent : C.red }}>{s.pnl >= 0 ? '+' : ''}${Math.abs(s.pnl).toFixed(0)}</div>
                    </div>
                  ))}
              </Panel>
              <Panel>
                <SectionHeader title="BY SESSION" />
                {sessionBreakdown.map((s) => (
                  <div key={s.session} style={{ padding: '8px 10px', background: '#ffffff04', marginBottom: 6, borderLeft: `2px solid ${s.pnl >= 0 ? C.accent : C.red}40`, borderRadius: 2 }}>
                    <div style={{ fontSize: 9, color: C.textDim, marginBottom: 3 }}>{s.session.replace('Market Open (9:30-10:30)', 'Open (9:30)')}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: s.pnl >= 0 ? C.accent : C.red }}>{s.pnl >= 0 ? '+' : ''}${Math.abs(s.pnl).toFixed(0)}</span>
                      <span style={{ fontSize: 9, color: C.textMuted }}>{s.winRate}% WR</span>
                    </div>
                  </div>
                ))}
              </Panel>
              <Panel>
                <SectionHeader title="ASSET MIX" />
                <ResponsiveContainer width="100%" height={110}>
                  <PieChart><Pie data={assetPieData} dataKey="value" cx="50%" cy="50%" outerRadius={48} innerRadius={26}>{assetPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}</Pie><Tooltip contentStyle={{ background: C.panel2, border: `1px solid ${C.borderBright}`, fontSize: 10, borderRadius: 3 }} /></PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                  {assetPieData.map((a, i) => <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: C.textDim }}><div style={{ width: 5, height: 5, borderRadius: '50%', background: PIE_COLORS[i] }} />{a.name}</div>)}
                </div>
              </Panel>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <Panel>
                <SectionHeader title="TODAY'S SESSION" />
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.12em', marginBottom: 6 }}>TODAY P&L</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: todayPnL >= 0 ? C.accent : C.red, letterSpacing: '-0.03em' }}>{fmt(todayPnL, 0)}</div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>{todayTrades.length} trades</div>
                  <div style={{ margin: '14px 0 6px', height: 4, background: C.border, borderRadius: 2 }}>
                    <div style={{ width: `${Math.min((Math.abs(todayPnL) / dailyMaxLoss) * 100, 100)}%`, height: '100%', background: todayPnL < 0 ? C.red : C.accent, borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 9, color: C.textMuted }}>{todayPnL < 0 ? `${(Math.abs(todayPnL) / dailyMaxLoss * 100).toFixed(0)}% of daily loss limit` : 'Safe'}</div>
                </div>
              </Panel>
              <Panel>
                <SectionHeader title="RECENT DAY PLANS" action={<button className="btn-g" onClick={() => setModal('plan')} style={{ padding: '3px 9px', fontSize: 9 }}>+ NEW</button>} />
                {plans.length === 0 ? <div style={{ color: C.textMuted, fontSize: 11, padding: '16px 0' }}>No plans yet. Plan your day before the market opens.</div> :
                  [...plans].reverse().slice(0, 3).map((p) => (
                    <div key={p.id} onClick={() => { setSelectedPlan(p); setTab('playbook') }}
                      style={{ padding: '10px 12px', background: '#ffffff04', marginBottom: 8, borderLeft: `2px solid ${p.bias === 'Bullish' ? C.accent : p.bias === 'Bearish' ? C.red : C.yellow}40`, cursor: 'pointer', borderRadius: 2 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600 }}>{p.date}</span>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <Pill color={p.bias === 'Bullish' ? C.accent : p.bias === 'Bearish' ? C.red : C.yellow}>{p.bias}</Pill>
                          <span style={{ fontSize: 9, color: C.textMuted }}>⚡{p.energyScore}/10</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 9, color: C.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.keyLevels || 'No key levels noted'}</div>
                    </div>
                  ))}
              </Panel>
            </div>
          </div>
        )}

        {/* ════ TRADE LOG ════ */}
        {tab === 'trades' && (
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <input className="inp" placeholder="Search symbol, setup, tags, notes…" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} style={{ maxWidth: 300 }} />
                <select className="inp" value={filterAsset} onChange={(e) => setFilterAsset(e.target.value)} style={{ width: 110 }}><option>All</option>{ASSET_TYPES.map((a) => <option key={a}>{a}</option>)}</select>
                <select className="inp" value={filterDir} onChange={(e) => setFilterDir(e.target.value)} style={{ width: 100 }}><option>All</option><option>Long</option><option>Short</option></select>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 10, color: C.textMuted }}>{filteredTrades.length} TRADES</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: filteredTrades.reduce((s, t) => s + t.pnl, 0) >= 0 ? C.accent : C.red }}>{fmt(filteredTrades.reduce((s, t) => s + t.pnl, 0))}</span>
                </div>
              </div>
              <Panel style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {[['date','DATE'],['symbol','SYMBOL'],['assetType','TYPE'],['direction','DIR'],['entryPrice','ENTRY'],['exitPrice','EXIT'],['qty','QTY'],['pnl','P&L'],['rMultiple','R'],['setup','SETUP'],['emotion','MOOD'],['grade','GRADE']].map(([k, l]) => (
                        <th key={k} onClick={() => { if (sortBy === k) setSortAsc(!sortAsc); else { setSortBy(k); setSortAsc(false) } }}
                          style={{ padding: '10px 11px', textAlign: 'left', fontSize: 8, color: C.textMuted, letterSpacing: '0.1em', cursor: 'pointer', userSelect: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {l}{sortBy === k ? (sortAsc ? ' ↑' : ' ↓') : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.length === 0 ? (
                      <tr><td colSpan={12} style={{ padding: '40px', textAlign: 'center', color: C.textMuted, fontSize: 11 }}>No trades match your filters.</td></tr>
                    ) : filteredTrades.map((t) => (
                      <tr key={t.id} className="tr" onClick={() => setSelectedTrade(selectedTrade?.id === t.id ? null : t)}
                        style={{ cursor: 'pointer', borderTop: `1px solid ${C.border}18`, background: selectedTrade?.id === t.id ? '#ffffff07' : 'transparent' }}>
                        <td style={{ padding: '8px 11px', color: C.textMuted, fontSize: 10, whiteSpace: 'nowrap' }}>{t.date}</td>
                        <td style={{ padding: '8px 11px', fontWeight: 700 }}>{t.symbol}</td>
                        <td style={{ padding: '8px 11px', fontSize: 9, color: C.textDim }}>{t.assetType}</td>
                        <td style={{ padding: '8px 11px' }}><span style={{ color: t.direction === 'Long' ? C.accent : C.red, fontSize: 9, fontWeight: 700 }}>{t.direction === 'Long' ? '▲' : '▼'} {t.direction}</span></td>
                        <td style={{ padding: '8px 11px', color: C.textDim }}>{fmtN(t.entryPrice)}</td>
                        <td style={{ padding: '8px 11px', color: C.textDim }}>{fmtN(t.exitPrice)}</td>
                        <td style={{ padding: '8px 11px', color: C.textMuted }}>{t.qty}</td>
                        <td style={{ padding: '8px 11px', fontWeight: 700, color: t.pnl >= 0 ? C.accent : C.red }}>{fmt(t.pnl)}</td>
                        <td style={{ padding: '8px 11px', fontSize: 10, color: t.rMultiple >= 1 ? C.accent : t.rMultiple >= 0 ? C.yellow : C.red }}>{t.rMultiple !== null ? `${t.rMultiple.toFixed(2)}R` : '—'}</td>
                        <td style={{ padding: '8px 11px', fontSize: 9, color: C.textDim }}>{t.setup}</td>
                        <td style={{ padding: '8px 11px', fontSize: 9, color: C.textDim }}>{t.emotion?.split(' ')[0]}</td>
                        <td style={{ padding: '8px 11px' }}><Pill color={t.grade?.startsWith('A') ? C.accent : t.grade?.startsWith('B') ? C.blue : C.red}>{t.grade}</Pill></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            </div>
            {selectedTrade && (
              <div style={{ width: 320, flexShrink: 0 }} className="fade-in">
                <Panel style={{ maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div><div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800 }}>{selectedTrade.symbol}</div><div style={{ fontSize: 9, color: C.textMuted, marginTop: 1 }}>{selectedTrade.assetType} · {selectedTrade.market} · {selectedTrade.date}</div></div>
                    <div style={{ textAlign: 'right' }}><div style={{ fontSize: 18, fontWeight: 700, color: selectedTrade.pnl >= 0 ? C.accent : C.red }}>{fmt(selectedTrade.pnl)}</div>{selectedTrade.rMultiple !== null && <div style={{ fontSize: 10, color: selectedTrade.rMultiple >= 0 ? C.accent : C.red }}>{selectedTrade.rMultiple.toFixed(2)}R</div>}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 10 }}>
                    {[['Direction', selectedTrade.direction, selectedTrade.direction === 'Long' ? C.accent : C.red],['Grade', selectedTrade.grade, selectedTrade.grade?.startsWith('A') ? C.accent : C.blue],['Entry', fmtN(selectedTrade.entryPrice), C.text],['Exit', fmtN(selectedTrade.exitPrice), C.text],['Qty', selectedTrade.qty, C.text],['Commission', `$${selectedTrade.commission}`, C.text],['Stop Loss', selectedTrade.stopLoss ? fmtN(selectedTrade.stopLoss) : '—', C.red],['Target', selectedTrade.takeProfit ? fmtN(selectedTrade.takeProfit) : '—', C.accent],['Entry Time', selectedTrade.entryTime || '—', C.text],['Exit Time', selectedTrade.exitTime || '—', C.text],['MAE', selectedTrade.mae || '—', C.red],['MFE', selectedTrade.mfe || '—', C.accent],['Confidence', `${selectedTrade.preTradeConfidence || '—'}/10`, C.yellow],['Session', selectedTrade.session || '—', C.text]].map(([k, v, col]) => (
                      <div key={k} style={{ background: '#ffffff04', padding: '6px 8px', borderRadius: 2 }}>
                        <div style={{ fontSize: 8, color: C.textMuted, letterSpacing: '0.08em' }}>{k.toUpperCase()}</div>
                        <div style={{ fontSize: 11, color: col, marginTop: 1, fontWeight: 500 }}>{String(v)}</div>
                      </div>
                    ))}
                  </div>
                  {selectedTrade.violations?.length > 0 && <div style={{ background: '#ff3d5a15', border: '1px solid #ff3d5a22', padding: '9px', marginBottom: 8, borderRadius: 2 }}><div style={{ fontSize: 8, color: C.red, letterSpacing: '0.1em', marginBottom: 5 }}>⚠ RULE VIOLATIONS</div><div>{selectedTrade.violations.map((v) => <span key={v} style={{ display: 'inline-block', background: '#ff3d5a20', color: C.red, padding: '2px 6px', fontSize: 9, margin: 2, borderRadius: 2 }}>{v}</span>)}</div></div>}
                  {selectedTrade.notes && <div style={{ background: '#ffffff04', padding: '9px', marginBottom: 8, borderRadius: 2 }}><div style={{ fontSize: 8, color: C.textMuted, marginBottom: 5 }}>NOTES</div><div style={{ fontSize: 10, color: C.textDim, lineHeight: 1.7 }}>{selectedTrade.notes}</div></div>}
                  {selectedTrade.postReview && <div style={{ background: C.accentDim, border: `1px solid ${C.accent}22`, padding: '9px', marginBottom: 8, borderRadius: 2 }}><div style={{ fontSize: 8, color: C.accent, marginBottom: 5 }}>POST-TRADE REVIEW</div><div style={{ fontSize: 10, color: C.textDim, lineHeight: 1.7 }}>{selectedTrade.postReview}</div></div>}
                  {selectedTrade.tags?.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>{selectedTrade.tags.map((tag) => <Pill key={tag}>#{tag}</Pill>)}</div>}
                  <button className="btn-g" onClick={() => { setTrades((p) => p.filter((t) => t.id !== selectedTrade.id)); setSelectedTrade(null) }} style={{ width: '100%', padding: '7px', fontSize: 10, color: C.red, borderColor: C.red + '44' }}>DELETE TRADE</button>
                </Panel>
              </div>
            )}
          </div>
        )}

        {/* ════ ANALYTICS ════ */}
        {tab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              <StatBox label="TOTAL TRADES" value={stats.totalTrades} sub={`${stats.wins}W / ${stats.losses}L`} />
              <StatBox label="AVG WIN" value={`$${stats.avgWin.toFixed(0)}`} color={C.accent} />
              <StatBox label="AVG LOSS" value={`$${Math.abs(stats.avgLoss).toFixed(0)}`} color={C.red} />
              <StatBox label="WIN/LOSS RATIO" value={stats.rr.toFixed(2)} color={stats.rr >= 1.5 ? C.accent : C.yellow} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Panel>
                <SectionHeader title="R-MULTIPLE PER TRADE" />
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={tw.filter((t) => t.rMultiple !== null).map((t) => ({ s: t.symbol, r: parseFloat((t.rMultiple || 0).toFixed(2)) }))}>
                    <CartesianGrid strokeDasharray="2 4" stroke={C.border} />
                    <XAxis dataKey="s" tick={{ fill: C.textMuted, fontSize: 8 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: C.textMuted, fontSize: 8 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}R`} />
                    <Tooltip contentStyle={{ background: C.panel2, border: `1px solid ${C.borderBright}`, fontSize: 10, borderRadius: 3 }} formatter={(v) => [`${v}R`, 'R']} />
                    <ReferenceLine y={0} stroke={C.textMuted} />
                    <Bar dataKey="r" radius={[2, 2, 0, 0]}>{tw.filter((t) => t.rMultiple !== null).map((t, i) => <Cell key={i} fill={t.rMultiple >= 0 ? C.accent : C.red} fillOpacity={0.8} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
              <Panel>
                <SectionHeader title="LONG vs SHORT" />
                {['Long', 'Short'].map((dir) => {
                  const dt = tw.filter((t) => t.direction === dir)
                  const pnl = dt.reduce((s, t) => s + t.pnl, 0)
                  const wr = dt.length ? (dt.filter((t) => t.win).length / dt.length) * 100 : 0
                  const avgR = dt.filter((t) => t.rMultiple != null).length ? dt.filter((t) => t.rMultiple != null).reduce((s, t) => s + t.rMultiple, 0) / dt.filter((t) => t.rMultiple != null).length : 0
                  return (
                    <div key={dir} style={{ padding: '13px', background: '#ffffff04', marginBottom: 10, borderLeft: `3px solid ${dir === 'Long' ? C.accent : C.red}`, borderRadius: 2 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                        <span style={{ fontWeight: 700, color: dir === 'Long' ? C.accent : C.red }}>{dir === 'Long' ? '▲ LONG' : '▼ SHORT'}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: pnl >= 0 ? C.accent : C.red }}>{fmt(pnl, 0)}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                        {[['TRADES', dt.length], ['WIN RATE', `${wr.toFixed(0)}%`], ['AVG R', `${avgR.toFixed(2)}R`]].map(([l, v]) => (
                          <div key={l} style={{ textAlign: 'center' }}><div style={{ fontSize: 8, color: C.textMuted }}>{l}</div><div style={{ fontSize: 12, fontWeight: 600, marginTop: 1 }}>{v}</div></div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </Panel>
              <Panel>
                <SectionHeader title="MARKET CONDITIONS" />
                {(() => {
                  const m = {}
                  tw.forEach((t) => { const c = t.marketCondition || 'Unknown'; if (!m[c]) m[c] = { wins: 0, total: 0, pnl: 0 }; m[c].total++; if (t.win) m[c].wins++; m[c].pnl += t.pnl })
                  return Object.entries(m).map(([cond, v]) => (
                    <div key={cond} style={{ marginBottom: 9 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}><span style={{ color: C.textDim }}>{cond}</span><span style={{ color: v.pnl >= 0 ? C.accent : C.red }}>{v.pnl >= 0 ? '+' : ''}${Math.abs(v.pnl).toFixed(0)}</span></div>
                      <div style={{ height: 3, background: C.border }}><div style={{ width: `${(v.wins / v.total) * 100}%`, height: '100%', background: v.wins / v.total >= 0.5 ? C.accent : C.red }} /></div>
                    </div>
                  ))
                })()}
              </Panel>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Panel>
                <SectionHeader title="TRADE GRADES" />
                {GRADES.filter((g) => tw.some((t) => t.grade === g)).map((g) => {
                  const gt = tw.filter((t) => t.grade === g), pnl = gt.reduce((s, t) => s + t.pnl, 0)
                  return (<div key={g} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <Pill color={g.startsWith('A') ? C.accent : g.startsWith('B') ? C.blue : C.red}>{g}</Pill>
                    <div style={{ flex: 1, height: 3, background: C.border }}><div style={{ width: `${(gt.length / tw.length) * 100}%`, height: '100%', background: g.startsWith('A') ? C.accent : g.startsWith('B') ? C.blue : C.red }} /></div>
                    <span style={{ fontSize: 9, color: C.textMuted, width: 18 }}>{gt.length}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: pnl >= 0 ? C.accent : C.red, width: 54, textAlign: 'right' }}>{fmt(pnl, 0)}</span>
                  </div>)
                })}
              </Panel>
              <Panel>
                <SectionHeader title="KEY EXTREMES" />
                {stats.bestTrade && (<div style={{ padding: '12px', background: C.accentDim, border: `1px solid ${C.accent}20`, marginBottom: 10, borderRadius: 2 }}><div style={{ fontSize: 8, color: C.accent, letterSpacing: '0.1em', marginBottom: 4 }}>BEST TRADE</div><div style={{ display: 'flex', justifyContent: 'space-between' }}><div><div style={{ fontSize: 15, fontWeight: 700 }}>{stats.bestTrade.symbol}</div><div style={{ fontSize: 9, color: C.textMuted }}>{stats.bestTrade.date} · {stats.bestTrade.setup}</div></div><div style={{ fontSize: 17, fontWeight: 700, color: C.accent }}>{fmt(stats.bestTrade.pnl, 0)}</div></div></div>)}
                {stats.worstTrade && (<div style={{ padding: '12px', background: '#ff3d5a15', border: '1px solid #ff3d5a20', borderRadius: 2 }}><div style={{ fontSize: 8, color: C.red, letterSpacing: '0.1em', marginBottom: 4 }}>WORST TRADE</div><div style={{ display: 'flex', justifyContent: 'space-between' }}><div><div style={{ fontSize: 15, fontWeight: 700 }}>{stats.worstTrade.symbol}</div><div style={{ fontSize: 9, color: C.textMuted }}>{stats.worstTrade.date} · {stats.worstTrade.setup}</div></div><div style={{ fontSize: 17, fontWeight: 700, color: C.red }}>{fmt(stats.worstTrade.pnl, 0)}</div></div></div>)}
              </Panel>
            </div>
          </div>
        )}

        {/* ════ PSYCHOLOGY ════ */}
        {tab === 'psychology' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              <StatBox label="RULE ADHERENCE" value={`${stats.ruleAdherence.toFixed(0)}%`} color={stats.ruleAdherence >= 85 ? C.accent : C.yellow} glow />
              <StatBox label="CLEAN TRADES" value={tw.filter((t) => !t.violations?.length).length} sub={`of ${tw.length} total`} color={C.accent} />
              <StatBox label="AVG CONFIDENCE" value={`${stats.avgConfidence.toFixed(1)}/10`} color={C.blue} />
              <StatBox label="VIOLATION TRADES" value={tw.filter((t) => t.violations?.length > 0).length} color={C.red} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Panel>
                <SectionHeader title="EMOTION → PERFORMANCE" />
                {emotionBreakdown.map((e) => (
                  <div key={e.emotion} style={{ marginBottom: 9, padding: '8px 10px', background: '#ffffff03', borderLeft: `2px solid ${parseInt(e.winRate) >= 60 ? C.accent : parseInt(e.winRate) >= 40 ? C.yellow : C.red}40`, borderRadius: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11 }}>{e.emotion}</span>
                      <div style={{ display: 'flex', gap: 10 }}><span style={{ fontSize: 9, color: C.textMuted }}>{e.total}T</span><span style={{ fontSize: 10, fontWeight: 600, color: e.pnl >= 0 ? C.accent : C.red }}>{fmt(e.pnl, 0)}</span></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 3, background: C.border }}><div style={{ width: `${e.winRate}%`, height: '100%', background: parseInt(e.winRate) >= 60 ? C.accent : parseInt(e.winRate) >= 40 ? C.yellow : C.red }} /></div>
                      <span style={{ fontSize: 9, color: C.textMuted, width: 28 }}>{e.winRate}%</span>
                    </div>
                  </div>
                ))}
              </Panel>
              <Panel>
                <SectionHeader title="RULE VIOLATIONS" />
                {violationStats.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 0', color: C.accent }}><div style={{ fontSize: 28, marginBottom: 8 }}>✓</div><div style={{ fontSize: 12 }}>No violations logged</div><div style={{ fontSize: 9, color: C.textMuted, marginTop: 4 }}>Excellent discipline!</div></div>
                ) : violationStats.map((v) => (
                  <div key={v.violation} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}><span style={{ color: C.textDim }}>{v.violation}</span><span style={{ color: v.pnl >= 0 ? C.yellow : C.red }}>{fmt(v.pnl, 0)}</span></div>
                      <div style={{ height: 3, background: C.border }}><div style={{ width: `${(v.count / Math.max(...violationStats.map((x) => x.count))) * 100}%`, height: '100%', background: C.red, opacity: 0.7 }} /></div>
                    </div>
                    <div style={{ background: '#ff3d5a20', color: C.red, padding: '2px 7px', fontSize: 11, fontWeight: 700, minWidth: 24, textAlign: 'center', borderRadius: 2 }}>{v.count}</div>
                  </div>
                ))}
              </Panel>
            </div>
            <Panel>
              <SectionHeader title="PRE-TRADE CONFIDENCE vs OUTCOME" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
                {Array.from({ length: 10 }, (_, i) => {
                  const conf = i + 1, ct = tw.filter((t) => t.preTradeConfidence === conf)
                  const pnl = ct.reduce((s, t) => s + t.pnl, 0)
                  const wr = ct.length ? (ct.filter((t) => t.win).length / ct.length) * 100 : 0
                  return (
                    <div key={conf} style={{ textAlign: 'center', padding: '10px 4px', background: '#ffffff04', border: `1px solid ${ct.length > 0 ? (pnl >= 0 ? C.accent + '30' : C.red + '30') : C.border}`, borderRadius: 3 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: ct.length > 0 ? (pnl >= 0 ? C.accent : C.red) : C.textMuted }}>{conf}</div>
                      <div style={{ fontSize: 8, color: C.textMuted, margin: '3px 0' }}>{ct.length}T</div>
                      {ct.length > 0 && <div style={{ fontSize: 8, color: pnl >= 0 ? C.accent : C.red }}>{wr.toFixed(0)}%</div>}
                    </div>
                  )
                })}
              </div>
            </Panel>
          </div>
        )}

        {/* ════ PLAYBOOK ════ */}
        {tab === 'playbook' && (
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.15em' }}>{plans.length} DAY PLANS</div>
                <button className="btn-p" onClick={() => setModal('plan')} style={{ padding: '7px 13px', fontSize: 10 }}>+ PLAN TODAY</button>
              </div>
              {plans.length === 0 ? (
                <Panel style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>No day plans yet</div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 20 }}>Professional traders plan before the market opens.</div>
                  <button className="btn-p" onClick={() => setModal('plan')} style={{ padding: '10px 20px', fontSize: 11 }}>CREATE FIRST PLAN</button>
                </Panel>
              ) : [...plans].reverse().map((p) => (
                <Panel key={p.id} style={{ cursor: 'pointer', marginBottom: 10, borderColor: selectedPlan?.id === p.id ? C.accent + '44' : C.border, transition: 'border-color .2s' }} onClick={() => setSelectedPlan(selectedPlan?.id === p.id ? null : p)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700 }}>{p.date}</div>
                        <Pill color={p.bias === 'Bullish' ? C.accent : p.bias === 'Bearish' ? C.red : C.yellow}>{p.bias}</Pill>
                        <Pill color={C.blue}>{p.marketCondition}</Pill>
                      </div>
                      <div style={{ fontSize: 10, color: C.textDim, marginBottom: 3 }}><span style={{ color: C.textMuted }}>LEVELS: </span>{p.keyLevels || '—'}</div>
                      <div style={{ fontSize: 10, color: C.textDim }}><span style={{ color: C.textMuted }}>WATCH: </span>{p.watchlist || '—'}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                      <div style={{ fontSize: 9, color: C.textMuted }}>MAX LOSS</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.red }}>${p.maxLoss}</div>
                      <div style={{ fontSize: 9, color: C.textMuted, marginTop: 3 }}>⚡{p.energyScore}/10</div>
                    </div>
                  </div>
                  {p.notes && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>{p.notes}</div>}
                </Panel>
              ))}
            </div>
            {selectedPlan && (
              <div style={{ width: 280, flexShrink: 0 }} className="fade-in">
                <Panel>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{selectedPlan.date}</div>
                  <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}><Pill color={selectedPlan.bias === 'Bullish' ? C.accent : selectedPlan.bias === 'Bearish' ? C.red : C.yellow}>{selectedPlan.bias}</Pill><Pill color={C.blue}>{selectedPlan.marketCondition}</Pill></div>
                  {[['KEY LEVELS', selectedPlan.keyLevels], ['WATCHLIST', selectedPlan.watchlist], ['TARGETS', selectedPlan.targets], ['NOTES', selectedPlan.notes]].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} style={{ marginBottom: 10 }}><div style={{ fontSize: 8, color: C.textMuted, letterSpacing: '0.1em', marginBottom: 3 }}>{k}</div><div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.7 }}>{v}</div></div>
                  ))}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
                    <div style={{ background: '#ff3d5a15', border: '1px solid #ff3d5a20', padding: '9px', textAlign: 'center', borderRadius: 2 }}><div style={{ fontSize: 8, color: C.textMuted }}>MAX LOSS</div><div style={{ fontSize: 15, fontWeight: 700, color: C.red }}>${selectedPlan.maxLoss}</div></div>
                    <div style={{ background: C.accentDim, border: `1px solid ${C.accent}20`, padding: '9px', textAlign: 'center', borderRadius: 2 }}><div style={{ fontSize: 8, color: C.textMuted }}>ENERGY</div><div style={{ fontSize: 15, fontWeight: 700, color: C.accent }}>{selectedPlan.energyScore}/10</div></div>
                  </div>
                  <button className="btn-g" onClick={() => { setPlans((p) => p.filter((x) => x.id !== selectedPlan.id)); setSelectedPlan(null) }} style={{ width: '100%', padding: '7px', fontSize: 10, marginTop: 10, color: C.red, borderColor: C.red + '44' }}>DELETE PLAN</button>
                </Panel>
              </div>
            )}
          </div>
        )}

        {/* ════ RISK ════ */}
        {tab === 'risk' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              <StatBox label="ACCOUNT SIZE" value={`$${accountSize.toLocaleString()}`} />
              <StatBox label="DAILY MAX LOSS" value={`$${dailyMaxLoss}`} color={C.red} />
              <StatBox label="RISK PER TRADE" value={`${riskPerTrade}%`} color={C.yellow} />
              <StatBox label="MAX DRAWDOWN" value={`$${stats.maxDD.toFixed(0)}`} color={C.red} />
            </div>
            <Panel>
              <SectionHeader title="RISK SETTINGS" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {[['Account Size ($)', accountSize, setAccountSize, 1000], ['Daily Max Loss ($)', dailyMaxLoss, setDailyMaxLoss, 50], ['Default Risk % per Trade', riskPerTrade, setRiskPerTrade, 0.1]].map(([label, val, setter, step]) => (
                  <div key={label}><div style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.1em', marginBottom: 5 }}>{String(label).toUpperCase()}</div><input className="inp" type="number" value={val} onChange={(e) => setter(parseFloat(e.target.value) || 0)} step={step} /></div>
                ))}
              </div>
            </Panel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Panel>
                <SectionHeader title="POSITION SIZE CALCULATOR" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  {[['Entry Price', 'entry'], ['Stop Loss Price', 'stop']].map(([label, key]) => (
                    <div key={key}><div style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.1em', marginBottom: 5 }}>{label.toUpperCase()}</div><input className="inp" type="number" value={posCalc[key]} onChange={(e) => setPosCalc((p) => ({ ...p, [key]: e.target.value }))} placeholder="0.00" /></div>
                  ))}
                  <div><div style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.1em', marginBottom: 5 }}>RISK % (BLANK = DEFAULT)</div><input className="inp" type="number" value={posCalc.risk} onChange={(e) => setPosCalc((p) => ({ ...p, risk: e.target.value }))} placeholder={`${riskPerTrade}%`} step="0.1" /></div>
                </div>
                {posResult ? (
                  <div style={{ background: C.accentDim, border: `1px solid ${C.accent}30`, padding: 14, borderRadius: 3 }}>
                    <div style={{ fontSize: 9, color: C.accent, letterSpacing: '0.12em', marginBottom: 12 }}>RESULT</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[['SHARES/CONTRACTS', posResult.shares], ['RISK AMOUNT', `$${posResult.riskAmt.toFixed(2)}`], ['RISK/SHARE', `$${posResult.riskPerShare.toFixed(4)}`], ['TOTAL POSITION', `$${posResult.totalValue.toFixed(2)}`]].map(([l, v]) => (
                        <div key={l} style={{ textAlign: 'center', padding: '9px', background: '#00000020', borderRadius: 2 }}><div style={{ fontSize: 8, color: C.textMuted }}>{l}</div><div style={{ fontSize: 15, fontWeight: 700, color: C.accent, marginTop: 2 }}>{v}</div></div>
                      ))}
                    </div>
                  </div>
                ) : <div style={{ textAlign: 'center', padding: '28px 0', color: C.textMuted, fontSize: 11 }}>Enter entry and stop prices to calculate</div>}
              </Panel>
              <Panel>
                <SectionHeader title="DAILY LOSS MONITOR (LAST 7 DAYS)" />
                {pnlByDay.slice(-7).map((d) => {
                  const pct = Math.abs(Math.min(d.pnl, 0)) / dailyMaxLoss * 100
                  return (<div key={d.date} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}><span style={{ color: C.textDim }}>{d.date}</span><span style={{ fontWeight: 600, color: d.pnl >= 0 ? C.accent : C.red }}>{fmt(d.pnl, 0)}</span></div>
                    <div style={{ height: 4, background: C.border, borderRadius: 2 }}><div style={{ width: `${Math.min(d.pnl >= 0 ? (d.pnl / dailyMaxLoss) * 100 : pct, 100)}%`, height: '100%', background: d.pnl >= 0 ? C.accent : pct >= 80 ? C.red : C.yellow, borderRadius: 2 }} /></div>
                    {d.pnl < 0 && pct >= 80 && <div style={{ fontSize: 8, color: C.red, marginTop: 2 }}>⚠ {pct.toFixed(0)}% of limit</div>}
                  </div>)
                })}
                <div style={{ marginTop: 14, padding: '12px', background: '#ffffff04', fontSize: 10, color: C.textDim, lineHeight: 1.8, borderRadius: 2 }}>
                  <div style={{ fontWeight: 600, color: C.yellow, marginBottom: 4, fontSize: 9, letterSpacing: '0.1em' }}>💡 RISK RULES</div>
                  <div>• Stop trading at ${dailyMaxLoss} daily loss</div>
                  <div>• Max {riskPerTrade}% account risk per trade</div>
                  <div>• Size down after 2 consecutive losses</div>
                  <div>• Never revenge trade after max loss hit</div>
                </div>
              </Panel>
            </div>
          </div>
        )}

        {/* ════ CALENDAR ════ */}
        {tab === 'calendar' && (
          <Panel>
            <SectionHeader title="MARCH 2025 — TRADE CALENDAR" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {['MON','TUE','WED','THU','FRI','SAT','SUN'].map((d) => <div key={d} style={{ textAlign: 'center', fontSize: 8, color: C.textMuted, padding: '6px 0', letterSpacing: '0.1em' }}>{d}</div>)}
              {Array.from({ length: 5 }, (_, i) => <div key={`p${i}`} style={{ height: 70 }} />)}
              {Array.from({ length: 31 }, (_, i) => {
                const day = i + 1, dateStr = `2025-03-${String(day).padStart(2, '0')}`
                const dt = tw.filter((t) => t.date === dateStr), dayPnl = dt.reduce((s, t) => s + t.pnl, 0)
                const hasPlan = plans.some((p) => p.date === dateStr)
                const intensity = dt.length ? Math.min(Math.abs(dayPnl) / 200, 1) : 0
                return (
                  <div key={day} style={{ height: 70, background: dt.length ? (dayPnl >= 0 ? `rgba(0,229,176,${0.05 + intensity * 0.18})` : `rgba(255,61,90,${0.05 + intensity * 0.18})`) : '#ffffff03', border: `1px solid ${dt.length ? (dayPnl >= 0 ? C.accent + '40' : C.red + '40') : C.border}`, padding: '6px 7px', borderRadius: 3 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: dt.length ? C.text : C.textMuted }}>{day}</span>
                      {hasPlan && <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.yellow, flexShrink: 0 }} />}
                    </div>
                    {dt.length > 0 && (<><div style={{ fontSize: 9, fontWeight: 700, color: dayPnl >= 0 ? C.accent : C.red, marginTop: 2 }}>{dayPnl >= 0 ? '+' : ''}${Math.abs(dayPnl).toFixed(0)}</div><div style={{ fontSize: 8, color: C.textMuted }}>{dt.length}T · {((dt.filter((t) => t.win).length / dt.length) * 100).toFixed(0)}% WR</div></>)}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 9, color: C.textMuted }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 8, height: 8, background: C.accent + '60', borderRadius: 1 }} /> Profit day</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 8, height: 8, background: C.red + '60', borderRadius: 1 }} /> Loss day</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: C.yellow }} /> Day plan</div>
            </div>
          </Panel>
        )}
      </div>

      {/* ════ MODALS ════ */}
      {modal === 'trade' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, width: 740, maxHeight: '92vh', overflowY: 'auto', padding: 28, borderRadius: 6 }} className="slide-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div><div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800 }}>LOG NEW TRADE</div><div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>Record every detail for better analysis</div></div>
              <button className="btn-g" onClick={() => setModal(null)} style={{ padding: '5px 11px', fontSize: 13 }}>✕</button>
            </div>
            <div style={{ fontSize: 9, color: C.accent, letterSpacing: '0.15em', marginBottom: 10 }}>▸ TRADE DETAILS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
              <Inp label="Date" field="date" type="date" form={tradeForm} onChange={tf} />
              <Inp label="Symbol" field="symbol" form={tradeForm} onChange={tf} />
              <Sel label="Asset Type" field="assetType" opts={ASSET_TYPES} form={tradeForm} onChange={tf} />
              <Sel label="Direction" field="direction" opts={['Long', 'Short']} form={tradeForm} onChange={tf} />
              <Inp label="Entry Price" field="entryPrice" type="number" form={tradeForm} onChange={tf} />
              <Inp label="Exit Price" field="exitPrice" type="number" form={tradeForm} onChange={tf} />
              <Inp label="Quantity" field="qty" type="number" form={tradeForm} onChange={tf} />
              <Inp label="Commission" field="commission" type="number" form={tradeForm} onChange={tf} />
              <Inp label="Stop Loss" field="stopLoss" type="number" form={tradeForm} onChange={tf} />
              <Inp label="Take Profit" field="takeProfit" type="number" form={tradeForm} onChange={tf} />
              <Inp label="MAE" field="mae" type="number" form={tradeForm} onChange={tf} />
              <Inp label="MFE" field="mfe" type="number" form={tradeForm} onChange={tf} />
            </div>
            <div style={{ fontSize: 9, color: C.accent, letterSpacing: '0.15em', marginBottom: 10 }}>▸ CONTEXT & PSYCHOLOGY</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
              <Sel label="Setup" field="setup" opts={SETUPS} form={tradeForm} onChange={tf} />
              <Sel label="Session" field="session" opts={SESSIONS} form={tradeForm} onChange={tf} />
              <Sel label="Market Cond." field="marketCondition" opts={MARKET_CONDITIONS} form={tradeForm} onChange={tf} />
              <Sel label="Emotion" field="emotion" opts={EMOTIONS} form={tradeForm} onChange={tf} />
              <Sel label="Grade" field="grade" opts={GRADES} form={tradeForm} onChange={tf} />
              <Inp label="Entry Time" field="entryTime" type="time" form={tradeForm} onChange={tf} />
              <Inp label="Exit Time" field="exitTime" type="time" form={tradeForm} onChange={tf} />
              <Inp label="Confidence (1-10)" field="preTradeConfidence" type="number" form={tradeForm} onChange={tf} min={1} max={10} />
            </div>
            <div style={{ fontSize: 9, color: C.accent, letterSpacing: '0.15em', marginBottom: 10 }}>▸ RULE VIOLATIONS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 16, padding: '12px', background: '#ffffff04', borderRadius: 3, border: `1px solid ${C.border}` }}>
              {RULE_VIOLATIONS.map((v) => (<label key={v} className="chk"><input type="checkbox" checked={tradeForm.violations.includes(v)} onChange={(e) => tf('violations', e.target.checked ? [...tradeForm.violations, v] : tradeForm.violations.filter((x) => x !== v))} /><span style={{ fontSize: 9, color: C.textDim }}>{v}</span></label>))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div><div style={{ fontSize: 8, color: C.textMuted, letterSpacing: '0.1em', marginBottom: 4 }}>TAGS (comma separated)</div><input className="inp" placeholder="earnings, tech, momentum…" value={tradeForm.tags} onChange={(e) => tf('tags', e.target.value)} /></div>
              <div><div style={{ fontSize: 8, color: C.textMuted, letterSpacing: '0.1em', marginBottom: 4 }}>MARKET</div><input className="inp" value={tradeForm.market} onChange={(e) => tf('market', e.target.value)} /></div>
            </div>
            <div style={{ marginBottom: 10 }}><div style={{ fontSize: 8, color: C.textMuted, letterSpacing: '0.1em', marginBottom: 4 }}>TRADE NOTES</div><textarea className="inp" rows={2} value={tradeForm.notes} onChange={(e) => tf('notes', e.target.value)} placeholder="Thesis, execution, what happened…" /></div>
            <div style={{ marginBottom: 18 }}><div style={{ fontSize: 8, color: C.textMuted, letterSpacing: '0.1em', marginBottom: 4 }}>POST-TRADE REVIEW</div><textarea className="inp" rows={2} value={tradeForm.postReview} onChange={(e) => tf('postReview', e.target.value)} placeholder="What went well? What to improve?" /></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-p" onClick={saveTrade} style={{ flex: 1, padding: '12px', fontSize: 12, letterSpacing: '0.1em' }}>LOG TRADE</button>
              <button className="btn-g" onClick={() => setModal(null)} style={{ padding: '12px 20px', fontSize: 11 }}>CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'plan' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, width: 580, maxHeight: '90vh', overflowY: 'auto', padding: 28, borderRadius: 6 }} className="slide-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div><div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800 }}>DAY PLAN</div><div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>Define your edge before the market opens</div></div>
              <button className="btn-g" onClick={() => setModal(null)} style={{ padding: '5px 11px', fontSize: 13 }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
              <Inp label="Date" field="date" type="date" form={planForm} onChange={pf} />
              <Sel label="Market Bias" field="bias" opts={['Bullish', 'Bearish', 'Neutral']} form={planForm} onChange={pf} />
              <Sel label="Condition" field="marketCondition" opts={MARKET_CONDITIONS} form={planForm} onChange={pf} />
              <Inp label="Max Loss ($)" field="maxLoss" type="number" form={planForm} onChange={pf} />
              <Inp label="Energy (1-10)" field="energyScore" type="number" form={planForm} onChange={pf} min={1} max={10} />
            </div>
            {[['KEY LEVELS', 'keyLevels', 'text'], ['WATCHLIST', 'watchlist', 'text'], ['TRADE TARGETS', 'targets', 'textarea'], ['NOTES / AVOID', 'notes', 'textarea']].map(([l, k, t]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 8, color: C.textMuted, letterSpacing: '0.1em', marginBottom: 4 }}>{l}</div>
                {t === 'textarea'
                  ? <textarea className="inp" rows={2} value={planForm[k]} onChange={(e) => pf(k, e.target.value)} />
                  : <input className="inp" value={planForm[k]} onChange={(e) => pf(k, e.target.value)} />}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn-p" onClick={savePlan} style={{ flex: 1, padding: '12px', fontSize: 12, letterSpacing: '0.1em' }}>SAVE PLAN</button>
              <button className="btn-g" onClick={() => setModal(null)} style={{ padding: '12px 20px', fontSize: 11 }}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
