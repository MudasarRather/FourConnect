<template>
  <!-- ══════════════════════ THE CLEARINGHOUSE — hero, ported WHOLE ══════════════════════
       Terminal header → live settlement tape → clearing grid (open-positions book +
       coverage index/sparkline + cause-exposure depth book + time-to-clear meter) →
       lens chip rail. Tape + board panels are terminal-dark in BOTH themes
       (--sd-rcg-board); the stage air is theme-native (--sd-rcg-stage). -->
  <section class="rcg-hero" :class="{ reduced }">
    <!-- ─── terminal header ─── -->
    <header class="term-head rise" style="--d:.02s">
      <div class="th-left">
        <span class="term-title"><span class="thin">SUPPORT DESK /</span> THE <em>CLEARINGHOUSE</em></span>
        <span class="sess sd-mono"><i class="sess-dot" aria-hidden="true" /> RCA SETTLEMENT SESSION · OPEN</span>
      </div>
      <div class="th-right sd-mono">
        <Landmark :size="13" aria-hidden="true" />
        <span class="clock">{{ clock }}</span>
      </div>
    </header>

    <!-- ─── settlement tape ─── -->
    <div class="tape-wrap rise" :class="{ glint: flashOn }" style="--d:.08s">
      <span class="tape-label sd-mono">SETTLEMENT TAPE · LIVE</span>
      <div class="tape sd-mono" :class="{ still: reduced }">
        <span v-for="(ev, i) in tapeLoop" :key="i" class="tk">
          <span class="sep">{{ ev.t }}</span><b>{{ ev.id }}</b>
          <span :class="ev.dir">{{ ev.verb }}</span>
          <span class="sep">{{ ev.meta }}</span><span class="sep">◆</span>
        </span>
      </div>
    </div>

    <!-- ─── clearing grid ─── -->
    <div class="rcg-grid">
      <!-- open positions book -->
      <div class="term-panel rise" style="--d:.16s">
        <div class="tp-head">
          <span class="tp-title sd-mono">OPEN POSITIONS — RCAs AWAITING CLEARANCE <i class="cursor" aria-hidden="true" /></span>
          <span class="tp-meta sd-mono">{{ positions.length }} ON THE STAND · T-CLOCKS LIVE</span>
        </div>
        <div class="book-head sd-mono">
          <span>POS</span><span>INSTRUMENT</span><span>SEV</span><span>FILED BY</span><span>T-TO-CLEAR</span>
        </div>
        <div v-if="positions.length" class="book-rows">
          <button v-for="(r, i) in positions" :key="r.ticket_id" class="pos-row"
            :style="{ '--i': i }" type="button" @click="$emit('open', r.ticket_id)">
            <span class="p-id sd-mono">{{ r.ticket_number }}<i v-if="i === 0" class="cursor" aria-hidden="true" /></span>
            <span class="p-sub">{{ r.subject }}</span>
            <span class="p-sev sd-mono" :class="`s${r.sev}`">S{{ r.sev }}</span>
            <span class="p-by sd-mono">{{ shortName(r.rca_filed_by_name) }}</span>
            <span class="p-ttc sd-mono" :class="{ aged: ttcMs(r) < 0 }">{{ fmtTtc(ttcMs(r)) }}</span>
          </button>
        </div>
        <div v-else class="book-empty">
          <span v-for="n in 4" :key="n" class="be-hair" aria-hidden="true" />
          <span class="be-msg sd-mono">BOOK CLEAR — NO OPEN POSITIONS ON THE STAND <i class="cursor" aria-hidden="true" /></span>
        </div>
        <div class="tp-foot sd-mono">FOUR-EYES ON THE STAND — THE FILING DESK CANNOT SETTLE ITS OWN POSITION.</div>
      </div>

      <!-- right column instruments -->
      <div class="rcg-col">
        <!-- coverage index + sparkline + time-to-clear -->
        <div class="term-panel" :class="{ pulse: flashOn }">
          <div class="idx-rise rise" style="--d:.24s">
            <div class="tp-head">
              <span class="tp-title sd-mono"><TrendingUp :size="11" aria-hidden="true" /> RCA COVERAGE INDEX</span>
              <span class="tp-meta sd-mono">90-DAY SESSION</span>
            </div>
            <div class="idx-body">
              <div class="idx-big sd-mono">
                <b>{{ idxDisplay }}</b><span class="pct">%</span>
                <span v-if="deltaText" class="delta" :class="deltaDir">{{ deltaText }}</span>
              </div>
              <div class="idx-sub sd-mono">{{ covered }} OF {{ eligible }} ELIGIBLE TERMINALS CARRY A FILED RCA</div>
              <svg class="spark" viewBox="0 0 240 52" preserveAspectRatio="none" aria-hidden="true">
                <polyline class="ln-validated" :points="sparkValidated" />
                <polyline class="ln-filed" :points="sparkFiled" />
                <circle v-if="sparkEnd" class="spark-end" :cx="sparkEnd.x" :cy="sparkEnd.y" r="2.6" />
              </svg>
              <div class="spark-key sd-mono">
                <span class="k-filed">— FILED / WK</span><span class="k-validated">— VALIDATED / WK</span>
              </div>
              <div class="ttc-meter">
                <div class="ttc-row sd-mono"><span>TIME TO CLEAR · MEDIAN</span><b>{{ fmtHours(latMedian) }}</b></div>
                <div class="ttc-track">
                  <i class="ttc-fill" :style="{ width: revealed ? `${latPct}%` : '0%' }" />
                  <i class="ttc-cap" aria-hidden="true" />
                </div>
                <div class="ttc-row sub sd-mono"><span>0h</span><span class="cap">P90 {{ fmtHours(latP90) }}</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- cause-exposure depth book -->
        <div class="term-panel rise" style="--d:.32s">
          <div class="tp-head">
            <span class="tp-title sd-mono">CAUSE EXPOSURE — DEPTH OF BOOK</span>
            <span class="tp-meta sd-mono">AMBER = OPEN BIDS ON A FIX</span>
          </div>
          <div class="depth-body">
            <template v-if="depth.length">
              <div v-for="d in depth" :key="d.key" class="depth-row sd-mono">
                <span class="lvl">{{ d.key }}</span>
                <span class="depth-track">
                  <i class="depth-fill cum" :style="{ width: revealed ? `${d.cumPct}%` : '0%' }" />
                  <i class="depth-fill" :style="{ width: revealed ? `${d.pct}%` : '0%' }" />
                </span>
                <span class="sz">{{ d.count }}</span>
                <span class="pc">{{ d.sharePct }}%</span>
              </div>
            </template>
            <template v-else>
              <div v-for="n in 4" :key="n" class="depth-row sd-mono is-zero">
                <span class="lvl">—</span><span class="depth-track" /><span class="sz">0</span><span class="pc">0%</span>
              </div>
            </template>
            <div class="depth-axis sd-mono"><span>◄ CUMULATIVE EXPOSURE</span><span>SIZE · %BOOK</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── lens chip rail ─── -->
    <div class="lens-rail rise" style="--d:.4s" role="tablist" aria-label="RCA lenses">
      <button v-for="c in chips" :key="c.key" class="f-chip sd-mono" :class="{ on: activeLens === c.key }"
        type="button" role="tab" :aria-selected="activeLens === c.key" @click="$emit('lens', c.key)">
        {{ c.label }}<b>{{ c.count }}</b>
      </button>
    </div>
  </section>
</template>

<script setup>
/*
  SdRcaGovernanceHero — THE CLEARINGHOUSE hero instrument (admin RCA desk).
  Pure projection: everything renders from the sealed board response
  (board rows + lockstep stats + aging) and the analytics packet; verbs live
  downstream in the docket. Emits lens / open / arrivals-seen only.
*/
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Landmark, TrendingUp } from 'lucide-vue-next'

const props = defineProps({
  board: { type: Array, default: () => [] },
  stats: { type: Object, default: null },
  analytics: { type: Object, default: null },
  aging: { type: Object, default: null },
  arrivals: { type: Object, default: () => ({ count: 0, ids: [] }) },
  now: { type: Number, default: () => Date.now() },
  reduced: { type: Boolean, default: false },
  activeLens: { type: String, default: 'pending' },
})
const emit = defineEmits(['lens', 'open', 'arrivals-seen'])

const CLEAR_SLA_MS = 48 * 3600 * 1000 // review clock: 48h from filing to a verdict

/* ── clock ── */
const pad2 = (n) => String(n).padStart(2, '0')
const clock = computed(() => {
  const d = new Date(props.now)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
})

/* ── settlement tape — synthesized from real board + analytics data ── */
const VERB = { filed: 'FILED', validated: 'SETTLED', returned: 'BOUNCED', owed: 'OWED', stale: 'STALE' }
const DIR = { validated: 'up', returned: 'dn', owed: 'dn', stale: 'dn', filed: '' }
const clockOf = (iso) => {
  const d = new Date(iso || '')
  return Number.isNaN(d.getTime()) ? '--:--' : `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
const tapeItems = computed(() => {
  const out = []
  for (const r of (props.board || []).slice(0, 8)) {
    const st = r.rca_status || 'owed'
    out.push({
      t: clockOf(r.rca_reviewed_at || r.rca_filed_at || r.resolved_at || r.closed_at),
      id: r.ticket_number || 'TKT', verb: VERB[st] || st.toUpperCase(),
      meta: (r.rca_category || r.team_name || 'UNROUTED DESK').toUpperCase() + ` · SEV${r.sev ?? 4}`,
      dir: DIR[st] || '',
    })
  }
  const s = props.stats
  if (s) {
    // board stats seal eligible + coverage_pct only; covered rides the analytics packet
    const elig = s.eligible ?? 0
    const cov = props.analytics?.coverage?.covered ?? Math.round((elig * Number(s.coverage_pct ?? 0)) / 100)
    out.push({ t: 'IDX', id: 'COVERAGE', verb: `${Number(s.coverage_pct ?? 0).toFixed(1)}`, meta: `${cov}/${elig} ELIGIBLE`, dir: 'up' })
  }
  const aged = props.aging?.d14_plus ?? 0
  if (aged > 0) out.push({ t: 'ALERT', id: 'AGED', verb: `${aged} PAST 14d`, meta: 'MARKED-TO-MARKET', dir: 'dn' })
  const lat = props.analytics?.review_latency
  if (lat?.median_hours != null) out.push({ t: 'TEMPO', id: 'CLEARANCE', verb: fmtHours(lat.median_hours), meta: 'FILED → VERDICT · MEDIAN', dir: '' })
  if (!out.length) out.push({ t: '--:--', id: 'SESSION', verb: 'OPEN', meta: 'AWAITING FIRST PRINT', dir: '' })
  return out
})
const tapeLoop = computed(() => [...tapeItems.value, ...tapeItems.value]) // duplicated for a seamless loop

/* ── open positions (filed rows awaiting a verdict) ── */
const positions = computed(() =>
  (props.board || []).filter((r) => (r.rca_status || '') === 'filed').slice(0, 5))
const ttcMs = (r) => {
  const filed = new Date(r.rca_filed_at || '').getTime()
  return Number.isNaN(filed) ? 0 : filed + CLEAR_SLA_MS - props.now
}
const fmtTtc = (ms) => {
  const neg = ms < 0
  let s = Math.floor(Math.abs(ms) / 1000)
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); s = s % 60
  return `${neg ? '-' : 'T-'}${pad2(h)}:${pad2(m)}:${pad2(s)}`
}
const shortName = (name) => {
  const t = String(name || '').trim()
  if (!t) return '—'
  const parts = t.split(/\s+/)
  return parts.length > 1 ? `${parts[0][0]}. ${parts[parts.length - 1]}`.toUpperCase() : t.toUpperCase()
}

/* ── coverage index — rAF count-up toward stats.coverage_pct ── */
const eligible = computed(() => props.stats?.eligible ?? 0)
const covered = computed(() => props.analytics?.coverage?.covered
  ?? Math.round((eligible.value * Number(props.stats?.coverage_pct ?? 0)) / 100))
const idxTarget = computed(() => Number(props.stats?.coverage_pct ?? 0))
const idxShown = ref(0)
let idxRaf = null
const tweenIdx = (to) => {
  cancelAnimationFrame(idxRaf)
  if (props.reduced) { idxShown.value = to; return }
  const from = idxShown.value; const t0 = performance.now(); const dur = 1200
  const step = (ts) => {
    const p = Math.min(1, (ts - t0) / dur); const e = 1 - Math.pow(1 - p, 3)
    idxShown.value = from + (to - from) * e
    if (p < 1) idxRaf = requestAnimationFrame(step)
  }
  idxRaf = requestAnimationFrame(step)
}
watch(idxTarget, (v) => tweenIdx(v))
const idxDisplay = computed(() => idxShown.value.toFixed(1))

/* ── sparkline — filed + validated weekly trend, endpoint emphasized ── */
const trend = computed(() => props.analytics?.trend || [])
const sparkPts = (key) => {
  const t = trend.value
  if (!t.length) return ''
  const max = Math.max(1, ...t.map((w) => Math.max(w.filed || 0, w.validated || 0)))
  const dx = 240 / Math.max(1, t.length - 1)
  return t.map((w, i) => `${(i * dx).toFixed(1)},${(48 - ((w[key] || 0) / max) * 42).toFixed(1)}`).join(' ')
}
const sparkFiled = computed(() => sparkPts('filed'))
const sparkValidated = computed(() => sparkPts('validated'))
const sparkEnd = computed(() => {
  const pts = sparkFiled.value.split(' ').filter(Boolean)
  if (!pts.length) return null
  const [x, y] = pts[pts.length - 1].split(',')
  return { x, y }
})
const deltaWow = computed(() => {
  const t = trend.value
  if (t.length < 2) return null
  return (t[t.length - 1].filed || 0) - (t[t.length - 2].filed || 0)
})
const deltaText = computed(() =>
  deltaWow.value == null ? '' : `${deltaWow.value >= 0 ? '▲ +' : '▼ '}${deltaWow.value} W/W`)
const deltaDir = computed(() => (deltaWow.value != null && deltaWow.value < 0 ? 'dn' : 'up'))

/* ── time-to-clear meter (review latency median vs p90) ── */
const latMedian = computed(() => props.analytics?.review_latency?.median_hours ?? 0)
const latP90 = computed(() => props.analytics?.review_latency?.p90_hours ?? 0)
const latPct = computed(() =>
  latP90.value > 0 ? Math.min(100, Math.round((latMedian.value / latP90.value) * 100)) : 0)
const fmtHours = (h) => {
  const v = Number(h || 0)
  return v >= 48 ? `${(v / 24).toFixed(1)}d` : `${v.toFixed(1)}h`
}

/* ── cause-exposure depth book ── */
const depth = computed(() => {
  const mix = [...(props.analytics?.category_mix || [])].sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 6)
  const total = mix.reduce((a, m) => a + (m.count || 0), 0) || 1
  let cum = 0
  return mix.map((m) => {
    cum += m.count || 0
    return {
      key: String(m.key || 'other').replace(/_/g, ' '),
      count: m.count || 0,
      pct: Math.round(((m.count || 0) / total) * 100),
      cumPct: Math.round((cum / total) * 100),
      sharePct: Math.round(((m.count || 0) / total) * 100),
    }
  })
})

/* ── lens chips — counts straight off the sealed stats block ── */
const chips = computed(() => {
  const s = props.stats || {}
  const n = (k) => s[k] ?? 0
  return [
    { key: 'owed', label: 'OWED', count: n('owed') },
    { key: 'returned', label: 'RETURNED', count: n('returned') },
    { key: 'pending', label: 'FILED', count: n('pending') },
    { key: 'validated', label: 'VALIDATED', count: n('validated') },
    { key: 'stale', label: 'STALE', count: n('stale') },
    { key: 'all', label: 'ALL', count: n('owed') + n('returned') + n('pending') + n('validated') + n('stale') },
  ]
})

/* ── arrivals flash: tape glint + index pulse, then hand the flag back ── */
const flashOn = ref(false)
let flashTimer = null
watch(() => props.arrivals?.count, (c) => {
  if (!c) return
  flashOn.value = true
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => { flashOn.value = false; emit('arrivals-seen') }, props.reduced ? 60 : 1600)
})

/* ── bar draw-in on reveal ── */
const revealed = ref(false)
onMounted(() => {
  if (props.reduced) { revealed.value = true; idxShown.value = idxTarget.value; return }
  requestAnimationFrame(() => { revealed.value = true })
  tweenIdx(idxTarget.value)
})
onBeforeUnmount(() => { cancelAnimationFrame(idxRaf); clearTimeout(flashTimer) })
</script>

<style scoped>
/* ═══ stage — theme-native air (bourse vellum on light) ═══ */
.rcg-hero { position: relative; border-radius: 20px; overflow: hidden;
  border: 1px solid var(--sd-rcg-brd);
  background:
    radial-gradient(110% 90% at 50% -12%, var(--sd-rcg-soft), transparent 60%),
    linear-gradient(180deg, var(--sd-rcg-stage), color-mix(in srgb, var(--sd-rcg-stage) 86%, var(--sd-canvas))); }
.rcg-hero::before { /* faint phosphor scanlines */
  content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background-image: repeating-linear-gradient(0deg,
    color-mix(in srgb, var(--sd-rcg-core) 3%, transparent) 0 1px, transparent 1px 4px); }
.rcg-hero > * { position: relative; z-index: 1; }

/* entrance choreography */
@keyframes rcg-term-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
.rise { opacity: 0; animation: rcg-term-in 0.7s var(--sd-spring) forwards; animation-delay: var(--d, 0s); }

/* ═══ terminal header ═══ */
.term-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;
  gap: 12px; padding: 16px 20px 12px; border-bottom: 1px solid var(--sd-rcg-brd); }
.th-left { display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap; }
.term-title { font-family: var(--sd-mono); font-size: clamp(17px, 2.2vw, 24px); font-weight: 700;
  letter-spacing: 0.06em; color: var(--sd-text); }
.term-title .thin { font-weight: 300; color: var(--sd-text-muted); }
.term-title em { font-style: normal; background: var(--sd-rcg-grad);
  -webkit-background-clip: text; background-clip: text; color: transparent; }
.sess { display: inline-flex; align-items: center; gap: 7px; font-size: 9px;
  letter-spacing: 0.22em; color: var(--sd-rcg-settle); }
.sess-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--sd-rcg-settle);
  box-shadow: 0 0 9px var(--sd-rcg-settle); animation: rcg-dot 1.8s ease-in-out infinite; }
@keyframes rcg-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.th-right { display: inline-flex; align-items: center; gap: 8px; color: var(--sd-rcg-core); }
.clock { font-size: 12px; letter-spacing: 0.14em; font-variant-numeric: tabular-nums; }

/* ═══ settlement tape — terminal-dark BOTH themes ═══ */
.tape-wrap { position: relative; overflow: hidden; border-bottom: 1px solid var(--sd-rcg-brd);
  background: linear-gradient(180deg, color-mix(in srgb, var(--sd-rcg-core) 6%, var(--sd-rcg-board)), var(--sd-rcg-board)); }
.tape-wrap::before, .tape-wrap::after { content: ""; position: absolute; top: 0; bottom: 0;
  width: 84px; z-index: 2; pointer-events: none; }
.tape-wrap::before { left: 0; background: linear-gradient(90deg, var(--sd-rcg-board), transparent); }
.tape-wrap::after { right: 0; background: linear-gradient(270deg, var(--sd-rcg-board), transparent); }
.tape-label { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); z-index: 3;
  font-size: 8px; letter-spacing: 0.3em; color: var(--sd-rcg-hi); background: var(--sd-rcg-board);
  padding: 3px 9px; border: 1px solid color-mix(in srgb, var(--sd-rcg-hi) 40%, transparent); border-radius: 3px; }
.tape { display: flex; width: max-content; padding: 10px 0; font-variant-numeric: tabular-nums;
  animation: rcg-tape 46s linear infinite; }
.tape:hover { animation-play-state: paused; }
.tape.still { animation: none; }
@keyframes rcg-tape { to { transform: translateX(-50%); } }
.tk { display: inline-flex; align-items: center; gap: 8px; font-size: 10.5px; padding: 0 24px;
  white-space: nowrap; color: var(--sd-rcg-board-dim); }
.tk b { color: var(--sd-rcg-hi); font-weight: 700; }
.tk .up { color: var(--sd-rcg-settle); }
.tk .dn { color: var(--sd-rcg-bounce); }
.tk .sep { color: color-mix(in srgb, var(--sd-rcg-board-dim) 60%, transparent); }
.tape-wrap.glint::after { animation: rcg-glint 1.4s ease; }
@keyframes rcg-glint {
  0% { background: linear-gradient(270deg, color-mix(in srgb, var(--sd-rcg-hi) 45%, var(--sd-rcg-board)), transparent); }
  100% { background: linear-gradient(270deg, var(--sd-rcg-board), transparent); } }

/* ═══ clearing grid ═══ */
.rcg-grid { display: grid; grid-template-columns: 1.68fr 1fr; gap: 14px; padding: 16px 18px 4px; }
.rcg-col { display: flex; flex-direction: column; gap: 14px; }
.term-panel { display: flex; flex-direction: column; overflow: hidden; border-radius: 12px;
  border: 1px solid var(--sd-rcg-board-line);
  background: linear-gradient(180deg, color-mix(in srgb, var(--sd-rcg-core) 4%, var(--sd-rcg-board)), var(--sd-rcg-board)); }
.tp-head { display: flex; justify-content: space-between; align-items: center; gap: 10px;
  padding: 9px 14px; border-bottom: 1px solid var(--sd-rcg-board-line);
  background: color-mix(in srgb, var(--sd-rcg-core) 5%, transparent); }
.tp-title { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px;
  letter-spacing: 0.24em; color: var(--sd-rcg-core); font-weight: 700; }
.tp-meta { font-size: 8.5px; color: var(--sd-rcg-board-dim); letter-spacing: 0.1em; }
.tp-foot { padding: 8px 14px 11px; font-size: 8.5px; letter-spacing: 0.06em;
  color: var(--sd-rcg-board-dim); border-top: 1px dashed var(--sd-rcg-board-line); }
.cursor { display: inline-block; width: 6px; height: 11px; margin-left: 5px;
  background: var(--sd-rcg-hi); vertical-align: -2px; animation: rcg-blink 1.1s steps(1) infinite; }
@keyframes rcg-blink { 50% { opacity: 0; } }

/* open positions book */
.book-head, .pos-row { display: grid; grid-template-columns: 92px 1fr 42px 110px 104px;
  gap: 10px; align-items: center; padding: 0 14px; }
.book-head { height: 28px; font-size: 8px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--sd-rcg-board-dim); border-bottom: 1px solid var(--sd-rcg-board-line); }
.book-rows { display: flex; flex-direction: column; }
.pos-row { height: 42px; width: 100%; text-align: left; cursor: pointer; border: none;
  background: transparent; border-bottom: 1px solid color-mix(in srgb, var(--sd-rcg-board-ink) 4%, transparent);
  transition: background 0.15s ease; opacity: 0; animation: rcg-term-in 0.5s var(--sd-spring) forwards;
  animation-delay: calc(0.3s + var(--i) * 0.06s); }
.pos-row:hover { background: color-mix(in srgb, var(--sd-rcg-core) 7%, transparent); }
.p-id { font-size: 10.5px; color: var(--sd-rcg-hi); font-weight: 700; letter-spacing: 0.04em; }
.p-sub { min-width: 0; font-size: 12px; color: var(--sd-rcg-board-ink);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.p-sev { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; }
.p-sev.s1 { color: var(--sd-rcg-bounce); }
.p-sev.s2 { color: var(--sd-rcg-warn); }
.p-sev.s3, .p-sev.s4 { color: var(--sd-rcg-core); }
.p-by { font-size: 9.5px; color: var(--sd-rcg-board-dim); letter-spacing: 0.06em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.p-ttc { font-size: 11px; color: var(--sd-rcg-board-ink); letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums; }
.p-ttc.aged { color: var(--sd-rcg-bounce); font-weight: 700; animation: rcg-aged 1.6s steps(1) infinite; }
@keyframes rcg-aged { 50% { opacity: 0.45; } }
.book-empty { position: relative; display: grid; place-items: center; min-height: 148px; padding: 14px; }
.be-hair { position: absolute; left: 14px; right: 14px; height: 1px; background: var(--sd-rcg-board-line); }
.be-hair:nth-child(1) { top: 24%; } .be-hair:nth-child(2) { top: 44%; }
.be-hair:nth-child(3) { top: 64%; } .be-hair:nth-child(4) { top: 84%; }
.be-msg { font-size: 9.5px; letter-spacing: 0.22em; color: var(--sd-rcg-board-dim); }

/* coverage index */
.idx-rise { display: flex; flex-direction: column; }
.term-panel.pulse { animation: rcg-pulse 1.5s ease; }
@keyframes rcg-pulse {
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-rcg-hi) 45%, transparent); }
  100% { box-shadow: 0 0 0 14px transparent; } }
.idx-body { padding: 14px 16px 16px; }
.idx-big { display: flex; align-items: baseline; gap: 8px; }
.idx-big b { font-size: clamp(42px, 4.2vw, 58px); font-weight: 200; letter-spacing: -0.02em;
  color: var(--sd-rcg-board-ink); font-variant-numeric: tabular-nums; }
.idx-big .pct { font-size: 17px; color: var(--sd-rcg-board-dim); }
.idx-big .delta { font-size: 11px; letter-spacing: 0.08em; color: var(--sd-rcg-settle); }
.idx-big .delta.dn { color: var(--sd-rcg-bounce); }
.idx-sub { font-size: 8.5px; color: var(--sd-rcg-board-dim); letter-spacing: 0.14em; margin-top: 2px; }
.spark { width: 100%; height: 52px; margin-top: 10px; }
.spark polyline { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.spark .ln-filed { stroke: var(--sd-rcg-hi); stroke-dasharray: 420; stroke-dashoffset: 420;
  animation: rcg-spark 2.2s ease forwards 0.5s; }
.spark .ln-validated { stroke: var(--sd-rcg-settle); opacity: 0.75; stroke-dasharray: 420;
  stroke-dashoffset: 420; animation: rcg-spark 2.2s ease forwards 0.8s; }
@keyframes rcg-spark { to { stroke-dashoffset: 0; } }
.spark-end { fill: var(--sd-rcg-hi); filter: drop-shadow(0 0 4px var(--sd-rcg-hi)); }
.spark-key { display: flex; gap: 14px; font-size: 7.5px; letter-spacing: 0.16em; margin-top: 2px; }
.k-filed { color: var(--sd-rcg-hi); } .k-validated { color: var(--sd-rcg-settle); }
.ttc-meter { margin-top: 12px; }
.ttc-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 9px;
  color: var(--sd-rcg-board-dim); letter-spacing: 0.12em; margin-bottom: 6px; }
.ttc-row b { color: var(--sd-rcg-board-ink); font-size: 12.5px; font-variant-numeric: tabular-nums; }
.ttc-row.sub { margin: 5px 0 0; }
.ttc-row .cap { color: var(--sd-rcg-bounce); }
.ttc-track { position: relative; height: 8px; border-radius: 4px; overflow: hidden;
  background: color-mix(in srgb, var(--sd-rcg-board-ink) 7%, transparent); }
.ttc-fill { position: absolute; inset: 0 auto 0 0; border-radius: 4px;
  background: linear-gradient(90deg, var(--sd-rcg-core), var(--sd-rcg-hi));
  transition: width 1.4s var(--sd-spring) 0.3s; }
.ttc-fill::after { content: ""; position: absolute; inset: 0;
  background: linear-gradient(100deg, transparent 30%, color-mix(in srgb, var(--sd-rcg-board-ink) 30%, transparent) 50%, transparent 70%);
  background-size: 200% 100%; animation: rcg-sheen 3.2s linear infinite; }
@keyframes rcg-sheen { to { background-position: -200% 0; } }
.ttc-cap { position: absolute; top: -3px; bottom: -3px; right: 0; width: 2px; background: var(--sd-rcg-bounce); }

/* depth book */
.depth-body { padding: 12px 16px 14px; }
.depth-row { display: grid; grid-template-columns: 96px 1fr 30px 40px; gap: 9px; align-items: center;
  margin-bottom: 8px; font-size: 9.5px; font-variant-numeric: tabular-nums; }
.depth-row .lvl { color: var(--sd-rcg-board-dim); letter-spacing: 0.1em; text-transform: uppercase;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.depth-track { position: relative; height: 14px; border-radius: 2px; overflow: hidden;
  background: color-mix(in srgb, var(--sd-rcg-board-ink) 4%, transparent); }
.depth-fill { position: absolute; right: 0; top: 0; bottom: 0; border-radius: 2px 0 0 2px;
  background: linear-gradient(270deg, color-mix(in srgb, var(--sd-rcg-hi) 85%, transparent), color-mix(in srgb, var(--sd-rcg-hi) 22%, transparent));
  transition: width 1.2s var(--sd-spring) 0.25s; }
.depth-fill.cum { background: linear-gradient(270deg, color-mix(in srgb, var(--sd-rcg-core) 32%, transparent), color-mix(in srgb, var(--sd-rcg-core) 5%, transparent)); }
.depth-row .sz { color: var(--sd-rcg-board-ink); text-align: right; font-size: 10.5px; }
.depth-row .pc { color: var(--sd-rcg-board-dim); text-align: right; font-size: 9px; }
.depth-row.is-zero .lvl, .depth-row.is-zero .sz, .depth-row.is-zero .pc { opacity: 0.5; }
.depth-row.is-zero .depth-track { border: 1px dashed var(--sd-rcg-board-line); background: transparent; }
.depth-axis { display: flex; justify-content: space-between; font-size: 7.5px; letter-spacing: 0.16em;
  color: color-mix(in srgb, var(--sd-rcg-board-dim) 70%, transparent); margin-top: 5px; }

/* ═══ lens rail — on the stage, theme-native ═══ */
.lens-rail { display: flex; gap: 8px; flex-wrap: wrap; padding: 12px 18px 16px; }
.f-chip { display: inline-flex; align-items: baseline; gap: 6px; font-size: 9.5px;
  letter-spacing: 0.12em; color: var(--sd-text-secondary); background: transparent; cursor: pointer;
  border: 1px solid color-mix(in srgb, var(--sd-rcg-core) 26%, transparent); border-radius: 999px;
  padding: 7px 14px; transition: transform 0.18s var(--sd-spring), border-color 0.18s, color 0.18s, background 0.18s; }
.f-chip b { color: var(--sd-text); font-variant-numeric: tabular-nums; }
.f-chip:hover { border-color: var(--sd-rcg-core); transform: translateY(-1px); }
.f-chip.on { color: var(--sd-rcg-core); border-color: var(--sd-rcg-core); background: var(--sd-rcg-soft); }
.f-chip.on b { color: var(--sd-rcg-core); }

@media (max-width: 1180px) {
  .rcg-grid { grid-template-columns: 1fr; }
  .book-head { display: none; }
  .pos-row { grid-template-columns: 92px 1fr 104px; height: auto; padding: 10px 14px; }
  .p-sev, .p-by { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .rise,
  html:not([data-cinematic="on"]) .pos-row { opacity: 1; animation: none !important; }
  html:not([data-cinematic="on"]) .tape,
  html:not([data-cinematic="on"]) .sess-dot,
  html:not([data-cinematic="on"]) .cursor,
  html:not([data-cinematic="on"]) .p-ttc.aged,
  html:not([data-cinematic="on"]) .ttc-fill::after,
  html:not([data-cinematic="on"]) .term-panel.pulse,
  html:not([data-cinematic="on"]) .tape-wrap.glint::after { animation: none !important; }
  html:not([data-cinematic="on"]) .spark polyline { stroke-dashoffset: 0; animation: none !important; }
}
</style>
