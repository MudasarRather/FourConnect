// Canonical statutory-config catalog — the SINGLE SOURCE OF TRUTH that mirrors the
// payroll engine (app/utils/hr/payroll/statutory.py). Every key here is a key the
// engine ACTUALLY reads via load_config(); the old Compliance UI wrote mismatched
// keys (PF_CEILING vs PF_WAGE_CEILING, ESI_RATE_EMPLOYEE vs ESI_EMP_RATE, PT_AMOUNT
// vs PT_SLABS, STANDARD_DEDUCTION vs STD_DEDUCTION_*) and treated rates as percents
// while the engine treats them as fractions — so configured values were silently
// ignored. This catalog closes that loophole: same keys, correct value semantics.
//
// kind:
//   'rate'  → engine stores a FRACTION (0.12); UI edits/show as percent (12%).
//   'money' → ₹ amount, stored as-is.
//   'bool'  → stored as value_num 1/0 (engine's _as_bool reads it).
//   'slabs' → value_json array; slabKind drives the row shape.

export const FAMILIES = [
  { key: 'pf',  label: 'Provident Fund', short: 'PF',  hex: '#fbbf24', icon: 'PiggyBank' },
  { key: 'esi', label: 'Employee State Insurance', short: 'ESI', hex: '#34d399', icon: 'HeartPulse' },
  { key: 'pt',  label: 'Professional Tax', short: 'PT', hex: '#fb923c', icon: 'Landmark' },
  { key: 'tax', label: 'Income Tax · TDS', short: 'TDS', hex: '#60a5fa', icon: 'Receipt' },
]
// brand-safe family accents (no blue/purple per brand) — tax uses ember
export const FAMILY_HEX = { pf: '#fbbf24', esi: '#34d399', pt: '#fb923c', tax: '#d97706' }
export const familyMeta = (k) => FAMILIES.find(f => f.key === k) || { key: k, label: k, short: k.toUpperCase(), hex: '#9ca3af' }

// scope: 'national' | 'state' (PT is state-scoped; the engine overrides national with state rows)
export const KEY_CATALOG = [
  // ── Provident Fund ──
  { key: 'PF_RATE', family: 'pf', label: 'PF contribution rate', kind: 'rate', def: 0.12, core: true, scope: 'national',
    hint: 'Share of PF wage contributed by employee (employer matches). Engine: base × PF_RATE.' },
  { key: 'PF_WAGE_CEILING', family: 'pf', label: 'PF wage ceiling', kind: 'money', def: 15000, core: true, scope: 'national',
    hint: 'Statutory wage cap PF is computed on (₹15,000 → ₹1,800) when restricted.' },
  { key: 'PF_RESTRICT_TO_CEILING', family: 'pf', label: 'Restrict PF to ceiling', kind: 'bool', def: true, scope: 'national',
    hint: 'On = PF on min(Basic, ceiling). Off = PF on full Basic (Para 26(6)).' },

  // ── ESI ──
  { key: 'ESI_EMP_RATE', family: 'esi', label: 'ESI rate — employee', kind: 'rate', def: 0.0075, core: true, scope: 'national' },
  { key: 'ESI_EMPLOYER_RATE', family: 'esi', label: 'ESI rate — employer', kind: 'rate', def: 0.0325, core: true, scope: 'national' },
  { key: 'ESI_GROSS_THRESHOLD', family: 'esi', label: 'ESI gross threshold', kind: 'money', def: 21000, core: true, scope: 'national',
    hint: 'ESI applies only when monthly gross ≤ this threshold.' },

  // ── Professional Tax (state) ──
  { key: 'PT_SLABS', family: 'pt', label: 'Professional Tax slabs', kind: 'slabs', slabKind: 'pt', core: true, scope: 'state',
    hint: 'State-wise monthly PT by gross slab. State rows override the national fallback.' },

  // ── Income Tax · TDS ──
  { key: 'TDS_SLABS_NEW', family: 'tax', label: 'TDS slabs — new regime', kind: 'slabs', slabKind: 'tds', core: true, scope: 'national' },
  { key: 'TDS_SLABS_OLD', family: 'tax', label: 'TDS slabs — old regime', kind: 'slabs', slabKind: 'tds', core: true, scope: 'national' },
  { key: 'SURCHARGE_SLABS', family: 'tax', label: 'Surcharge bands', kind: 'slabs', slabKind: 'surcharge', scope: 'national' },
  { key: 'STD_DEDUCTION_NEW', family: 'tax', label: 'Standard deduction — new', kind: 'money', def: 75000, core: true, scope: 'national' },
  { key: 'STD_DEDUCTION_OLD', family: 'tax', label: 'Standard deduction — old', kind: 'money', def: 50000, core: true, scope: 'national' },
  { key: 'CESS_RATE', family: 'tax', label: 'Health & education cess', kind: 'rate', def: 0.04, core: true, scope: 'national' },
  { key: 'REBATE_87A_LIMIT_NEW', family: 'tax', label: '87A rebate limit — new', kind: 'money', def: 1200000, scope: 'national' },
  { key: 'REBATE_87A_MAX_NEW', family: 'tax', label: '87A max rebate — new', kind: 'money', def: 60000, scope: 'national' },
  { key: 'REBATE_87A_LIMIT_OLD', family: 'tax', label: '87A rebate limit — old', kind: 'money', def: 500000, scope: 'national' },
  { key: 'REBATE_87A_MAX_OLD', family: 'tax', label: '87A max rebate — old', kind: 'money', def: 12500, scope: 'national' },
  { key: 'SEC_80C_CAP', family: 'tax', label: '80C cap (old regime)', kind: 'money', def: 150000, scope: 'national' },
  { key: 'SEC_80D_CAP', family: 'tax', label: '80D cap (old regime)', kind: 'money', def: 25000, scope: 'national' },
  { key: 'SEC_80CCD1B_CAP', family: 'tax', label: '80CCD(1B) NPS cap', kind: 'money', def: 50000, scope: 'national' },
  { key: 'SEC_80TTA_CAP', family: 'tax', label: '80TTA cap', kind: 'money', def: 10000, scope: 'national' },
  { key: 'SEC_24B_CAP', family: 'tax', label: '24(b) home-loan cap', kind: 'money', def: 200000, scope: 'national' },
]

export const CATALOG_BY_KEY = Object.fromEntries(KEY_CATALOG.map(k => [k.key, k]))
export const CORE_KEYS = KEY_CATALOG.filter(k => k.core).map(k => k.key)
export const catalogFor = (key) => CATALOG_BY_KEY[key] || null
export const keyOptionsForSelect = () => KEY_CATALOG.map(k => ({ value: k.key, label: `${familyMeta(k.family).short} · ${k.label}` }))

// ── value <-> storage helpers (rate = percent UI, fraction storage) ──────────
export function uiToStorage(kind, uiVal) {
  if (uiVal === '' || uiVal == null) return null
  const n = Number(uiVal)
  if (Number.isNaN(n)) return null
  if (kind === 'rate') return +(n / 100).toFixed(6)
  if (kind === 'bool') return n ? 1 : 0
  return n
}
export function storageToUi(kind, storeVal) {
  if (storeVal == null) return ''
  const n = Number(storeVal)
  if (Number.isNaN(n)) return ''
  if (kind === 'rate') return +(n * 100).toFixed(4)
  return n
}

export const inr = (v) => '₹' + Math.round(Number(v) || 0).toLocaleString('en-IN')
export const inrExact = (v) => '₹' + (Number(v) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })

// Human-readable value for a config row, using its catalog kind.
export function displayValue(row) {
  const c = catalogFor(row.key)
  const kind = c?.kind || (row.value_json != null ? 'slabs' : 'money')
  if (kind === 'slabs') {
    const n = Array.isArray(row.value_json) ? row.value_json.length : 0
    return `${n} slab${n === 1 ? '' : 's'}`
  }
  if (row.value_num == null) return '—'
  const n = Number(row.value_num)
  if (kind === 'rate') return `${+(n * 100).toFixed(4)}%`
  if (kind === 'bool') return n ? 'On' : 'Off'
  return inr(n)
}

// ── resolve active rows + catalog defaults into a flat dict (mirrors load_config) ──
export function resolveConfig(rows, stateCode = null) {
  const cfg = {}
  const active = (rows || []).filter(r => r.is_active !== false)
  for (const scope of [null, stateCode]) {
    for (const r of active) {
      if ((r.state_code || null) !== scope) continue
      cfg[r.key] = r.value_json != null ? r.value_json : (r.value_num != null ? Number(r.value_num) : null)
    }
  }
  for (const k of KEY_CATALOG) {
    if (cfg[k.key] == null && k.kind !== 'slabs') cfg[k.key] = k.def
  }
  // PT is a STATE levy — the national fallback is "no PT" (mirrors the engine's
  // _DEFAULT_PT_SLABS). State-scoped rows override it per employee at payroll time.
  cfg.PT_SLABS = cfg.PT_SLABS || [{ upto: null, amount: 0 }]
  cfg.TDS_SLABS_NEW = cfg.TDS_SLABS_NEW || [
    { upto: 400000, rate: 0 }, { upto: 800000, rate: 0.05 }, { upto: 1200000, rate: 0.10 },
    { upto: 1600000, rate: 0.15 }, { upto: 2000000, rate: 0.20 }, { upto: 2400000, rate: 0.25 }, { upto: null, rate: 0.30 },
  ]
  cfg.TDS_SLABS_OLD = cfg.TDS_SLABS_OLD || [
    { upto: 250000, rate: 0 }, { upto: 500000, rate: 0.05 }, { upto: 1000000, rate: 0.20 }, { upto: null, rate: 0.30 },
  ]
  return cfg
}

// Which core engine inputs are configured for this FY/state vs falling back to default.
export function engineCoverage(rows, stateCode = null) {
  const active = (rows || []).filter(r => r.is_active !== false)
  const present = new Set(active.map(r => r.key))
  const configured = CORE_KEYS.filter(k => present.has(k))
  return { configured: configured.length, total: CORE_KEYS.length, missing: CORE_KEYS.filter(k => !present.has(k)) }
}

// Rows whose key the engine does NOT read (legacy / typo'd keys → silently ignored).
export function unmappedRows(rows) {
  return (rows || []).filter(r => !CATALOG_BY_KEY[r.key])
}

// ── engine-accurate paycheck simulator (mirrors statutory.py) ────────────────
const dec = (v, d = 0) => { const n = Number(v); return Number.isNaN(n) ? d : n }
function progressiveTax(taxable, slabs) {
  let tax = 0, prev = 0
  for (const s of slabs) {
    const cap = s.upto == null ? null : dec(s.upto)
    const rate = dec(s.rate)
    if (cap == null) { tax += Math.max(0, taxable - prev) * rate; break }
    if (taxable > cap) { tax += (cap - prev) * rate; prev = cap }
    else { tax += Math.max(0, taxable - prev) * rate; break }
  }
  return tax
}
function rebate87a(taxable, baseTax, regime, cfg) {
  if (regime === 'OLD') {
    const lim = dec(cfg.REBATE_87A_LIMIT_OLD, 500000), mx = dec(cfg.REBATE_87A_MAX_OLD, 12500)
    return taxable <= lim ? Math.min(baseTax, mx) : 0
  }
  const lim = dec(cfg.REBATE_87A_LIMIT_NEW, 1200000), mx = dec(cfg.REBATE_87A_MAX_NEW, 60000)
  if (taxable <= lim) return Math.min(baseTax, mx)
  return Math.max(0, baseTax - (taxable - lim))
}
export function simulatePay({ gross = 0, basic = 0, regime = 'NEW' }, cfg) {
  gross = Math.max(0, dec(gross)); basic = Math.max(0, dec(basic))
  const restrict = !(String(cfg.PF_RESTRICT_TO_CEILING).toLowerCase() === '0' || cfg.PF_RESTRICT_TO_CEILING === 0 || cfg.PF_RESTRICT_TO_CEILING === false)
  const pfBase = restrict ? Math.min(basic, dec(cfg.PF_WAGE_CEILING, 15000)) : basic
  const pfEmp = pfBase * dec(cfg.PF_RATE, 0.12)
  const pfEmpr = pfEmp
  const esiOn = gross <= dec(cfg.ESI_GROSS_THRESHOLD, 21000)
  const esiEmp = esiOn ? gross * dec(cfg.ESI_EMP_RATE, 0.0075) : 0
  const esiEmpr = esiOn ? gross * dec(cfg.ESI_EMPLOYER_RATE, 0.0325) : 0
  let pt = 0
  for (const s of (cfg.PT_SLABS || [])) { if (s.upto == null || gross <= dec(s.upto)) { pt = dec(s.amount); break } }
  // monthly TDS via annualised slab tax (matches engine's cumulative-averaging baseline)
  const annual = gross * 12
  const std = regime === 'OLD' ? dec(cfg.STD_DEDUCTION_OLD, 50000) : dec(cfg.STD_DEDUCTION_NEW, 75000)
  const slabs = regime === 'OLD' ? cfg.TDS_SLABS_OLD : cfg.TDS_SLABS_NEW
  const taxable = Math.max(0, annual - std)
  const baseTax = progressiveTax(taxable, slabs || [])
  const afterRebate = Math.max(0, baseTax - rebate87a(taxable, baseTax, regime, cfg))
  const cess = dec(cfg.CESS_RATE, 0.04)
  const tds = (afterRebate * (1 + cess)) / 12
  const empTotal = pfEmp + esiEmp + pt + tds
  const emprTotal = pfEmpr + esiEmpr
  const takeHome = Math.max(0, gross - empTotal)
  return { pfEmp, pfEmpr, esiEmp, esiEmpr, pt, tds, empTotal, emprTotal, takeHome, esiOn, ctc: gross + emprTotal }
}
