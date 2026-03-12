import { C } from './constants.js'

export const calcPnL = (t) => {
  const raw =
    t.direction === 'Long'
      ? (t.exitPrice - t.entryPrice) * t.qty
      : (t.entryPrice - t.exitPrice) * t.qty
  return raw - (t.commission || 0)
}

export const calcR = (t) => {
  if (!t.stopLoss) return null
  const risk = Math.abs(t.entryPrice - t.stopLoss) * t.qty
  return risk === 0 ? null : calcPnL(t) / risk
}

export const calcExpectancy = (trades) => {
  if (!trades.length) return 0
  const wins = trades.filter((t) => t.pnl > 0)
  const losses = trades.filter((t) => t.pnl <= 0)
  const wr = wins.length / trades.length
  const avgW = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
  const avgL = losses.length
    ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length)
    : 0
  return wr * avgW - (1 - wr) * avgL
}

export const calcSharpe = (trades) => {
  if (trades.length < 2) return 0
  const returns = trades.map((t) => t.pnl)
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const std = Math.sqrt(
    returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length,
  )
  return std === 0 ? 0 : (mean / std) * Math.sqrt(252)
}

export const fmt = (n, d = 2) => {
  const abs = Math.abs(n)
    .toFixed(d)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return n >= 0 ? `+$${abs}` : `-$${abs}`
}

export const fmtN = (n) =>
  Number(n)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')

// ─── Shared UI ─────────────────────────────────────────────────────────────
export function Pill({ children, color = C.accent }) {
  return (
    <span
      style={{
        background: color + '20',
        color,
        padding: '2px 7px',
        fontSize: 9,
        letterSpacing: '0.08em',
        borderRadius: 2,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  )
}

export function StatBox({ label, value, sub, color = C.text, glow }) {
  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        padding: '14px 16px',
        borderRadius: 4,
        transition: 'border-color .2s',
        cursor: 'default',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.borderBright)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
    >
      <div
        style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.12em', marginBottom: 6 }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color,
          textShadow: glow ? `0 0 20px ${color}80` : 'none',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 9, color: C.textMuted, marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

export function Panel({ children, style = {} }) {
  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        padding: 20,
        borderRadius: 4,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function SectionHeader({ title, action }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
      }}
    >
      <div style={{ fontSize: 9, letterSpacing: '0.15em', color: C.textMuted, fontWeight: 600 }}>
        {title}
      </div>
      {action}
    </div>
  )
}

export function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: C.panel2,
        border: `1px solid ${C.borderBright}`,
        padding: '10px 14px',
        fontSize: 11,
        borderRadius: 3,
      }}
    >
      <div style={{ color: C.textMuted, marginBottom: 4, fontSize: 9 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.value >= 0 ? C.accent : C.red }}>
          {typeof p.value === 'number' ? `$${p.value.toFixed(2)}` : p.value}
        </div>
      ))}
    </div>
  )
}
