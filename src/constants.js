export const ASSET_TYPES = ['Stock', 'Options', 'Futures', 'Crypto', 'Forex']
export const DIRECTIONS = ['Long', 'Short']
export const SETUPS = [
  'Breakout', 'Pullback', 'Reversal', 'Momentum', 'Scalp', 'Swing',
  'Gap & Go', 'VWAP Reclaim', 'Support/Resistance', 'Earnings Play',
  'News Play', 'Pre-Market', 'Opening Range', 'Mean Reversion', 'Other',
]
export const EMOTIONS = [
  'Calm & Focused', 'Confident', 'Disciplined', 'FOMO', 'Revenge',
  'Anxious', 'Overconfident', 'Greedy', 'Bored', 'Uncertain', 'Tired', 'In the Zone',
]
export const GRADES = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F']
export const SESSIONS = [
  'Pre-Market', 'Market Open (9:30-10:30)', 'Late Morning',
  'Midday', 'Power Hour', 'After Hours',
]
export const RULE_VIOLATIONS = [
  'Chased entry', 'No stop loss', 'Oversized position', 'Averaged down loser',
  'Broke max daily loss', 'Traded outside plan', 'FOMO entry', 'Revenge trade',
  'Moved stop loss', 'Exited early (fear)', 'Held too long (greed)', 'Traded without setup',
]
export const MARKET_CONDITIONS = [
  'Trending Up', 'Trending Down', 'Range Bound',
  'High Volatility', 'Low Volatility', 'News Driven', 'Choppy',
]

export const SAMPLE_TRADES = [
  { id: 1, date: '2025-03-03', symbol: 'AAPL', assetType: 'Stock', direction: 'Long', entryPrice: 178.50, exitPrice: 183.20, qty: 100, commission: 2, setup: 'Breakout', emotion: 'Confident', grade: 'A', notes: 'Clean break above $178 resistance with volume. Held through first pullback. Exited at R2.', tags: ['tech', 'momentum'], market: 'NASDAQ', entryTime: '09:45', exitTime: '14:30', stopLoss: 175.00, takeProfit: 185.00, mae: 1.20, mfe: 5.80, violations: [], session: 'Market Open (9:30-10:30)', marketCondition: 'Trending Up', riskPercent: 1.0, preTradeConfidence: 8, postReview: 'Executed perfectly. Patient entry, respected the plan.' },
  { id: 2, date: '2025-03-04', symbol: 'TSLA', assetType: 'Stock', direction: 'Short', entryPrice: 195.00, exitPrice: 188.50, qty: 50, commission: 1.5, setup: 'Reversal', emotion: 'Calm & Focused', grade: 'A+', notes: 'Distribution at resistance. Short on breakdown. Clean target hit.', tags: ['tech', 'reversal'], market: 'NASDAQ', entryTime: '10:15', exitTime: '11:45', stopLoss: 198.00, takeProfit: 188.00, mae: 0.80, mfe: 7.20, violations: [], session: 'Market Open (9:30-10:30)', marketCondition: 'Trending Down', riskPercent: 0.8, preTradeConfidence: 9, postReview: 'Best trade of the week. Setup was textbook.' },
  { id: 3, date: '2025-03-05', symbol: 'SPY', assetType: 'Options', direction: 'Long', entryPrice: 4.20, exitPrice: 3.10, qty: 10, commission: 5, setup: 'Momentum', emotion: 'FOMO', grade: 'D', notes: 'Chased after missing initial move. No plan, no stop. Classic FOMO.', tags: ['index', 'options'], market: 'CBOE', entryTime: '13:00', exitTime: '13:45', stopLoss: 3.50, takeProfit: 6.00, mae: 1.30, mfe: 0.20, violations: ['FOMO entry', 'Chased entry', 'No stop loss'], session: 'Midday', marketCondition: 'Choppy', riskPercent: 2.2, preTradeConfidence: 4, postReview: 'Broke 3 rules. Must wait for setups, not chase.' },
  { id: 4, date: '2025-03-06', symbol: 'BTC-USD', assetType: 'Crypto', direction: 'Long', entryPrice: 62400, exitPrice: 64800, qty: 0.5, commission: 8, setup: 'Support/Resistance', emotion: 'Disciplined', grade: 'B+', notes: 'Planned level held perfectly. Partial at R1, runner to R2.', tags: ['crypto', 'swing'], market: 'BINANCE', entryTime: '08:00', exitTime: '16:00', stopLoss: 61000, takeProfit: 65500, mae: 800, mfe: 2600, violations: [], session: 'Pre-Market', marketCondition: 'Trending Up', riskPercent: 1.4, preTradeConfidence: 7, postReview: 'Good patience. Could have held for R3.' },
  { id: 5, date: '2025-03-10', symbol: 'NVDA', assetType: 'Stock', direction: 'Long', entryPrice: 875.00, exitPrice: 892.50, qty: 20, commission: 2, setup: 'Gap & Go', emotion: 'In the Zone', grade: 'A+', notes: 'Pre-market catalyst. Gap continuation held VWAP all day.', tags: ['tech', 'AI', 'gap'], market: 'NASDAQ', entryTime: '09:32', exitTime: '10:15', stopLoss: 865.00, takeProfit: 895.00, mae: 2.50, mfe: 19.50, violations: [], session: 'Market Open (9:30-10:30)', marketCondition: 'High Volatility', riskPercent: 1.0, preTradeConfidence: 9, postReview: 'Best gap trade this month.' },
  { id: 6, date: '2025-03-11', symbol: 'QQQ', assetType: 'Options', direction: 'Short', entryPrice: 8.50, exitPrice: 12.30, qty: 5, commission: 4, setup: 'Reversal', emotion: 'Disciplined', grade: 'A', notes: 'Put spread at tech resistance. Held conviction through morning squeeze.', tags: ['index', 'hedge'], market: 'CBOE', entryTime: '11:00', exitTime: '15:30', stopLoss: 7.00, takeProfit: 13.00, mae: 1.50, mfe: 4.20, violations: [], session: 'Late Morning', marketCondition: 'High Volatility', riskPercent: 0.9, preTradeConfidence: 8, postReview: 'Stayed with plan despite heat. Paid off.' },
  { id: 7, date: '2025-03-12', symbol: 'ES', assetType: 'Futures', direction: 'Long', entryPrice: 5245.00, exitPrice: 5255.00, qty: 2, commission: 8, setup: 'VWAP Reclaim', emotion: 'Calm & Focused', grade: 'B+', notes: 'Scalp off VWAP reclaim. Quick 10pt target. Clean in and out.', tags: ['futures', 'scalp'], market: 'CME', entryTime: '10:30', exitTime: '10:55', stopLoss: 5238.00, takeProfit: 5256.00, mae: 3.00, mfe: 12.00, violations: [], session: 'Late Morning', marketCondition: 'Range Bound', riskPercent: 0.6, preTradeConfidence: 7, postReview: 'Solid scalp. Right time right place.' },
]

export const C = {
  bg: '#07090d',
  panel: '#0c1018',
  panel2: '#10161f',
  border: '#18212e',
  borderBright: '#22303f',
  accent: '#00e5b0',
  accentDim: '#00e5b015',
  accentGlow: '#00e5b040',
  red: '#ff3d5a',
  redDim: '#ff3d5a15',
  yellow: '#f5a623',
  blue: '#3d8ef0',
  blueDim: '#3d8ef018',
  purple: '#a78bfa',
  text: '#dde4ee',
  textMuted: '#40586e',
  textDim: '#7a94aa',
}

export const PIE_COLORS = [C.accent, C.blue, C.yellow, C.red, C.purple, '#fb923c']
