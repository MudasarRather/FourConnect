<template>
  <div class="rec" :class="{ reduced }">
    <!-- ═══════════════ RECORDER CONSOLE ═══════════════ -->
    <header class="rec-console">
      <div class="rec-grain" aria-hidden="true"></div>

      <div class="rec-top">
        <div class="rec-id">
          <span class="rec-led" :class="{ live: !loading }"><i></i></span>
          <div class="rec-id-txt">
            <span class="rec-eyebrow">Payroll Flight Recorder</span>
            <h3 class="rec-title">Audit Telemetry</h3>
          </div>
        </div>

        <div class="rec-readout">
          <div class="ro-block">
            <span class="ro-l">Events captured</span>
            <b class="ro-v"><PayCountUp :value="total" /></b>
          </div>
          <div class="ro-sep"></div>
          <div class="ro-block">
            <span class="ro-l">Inspecting</span>
            <b class="ro-v mono" :class="focusEvent ? actCls(focusEvent.action) : ''">
              {{ focusEvent ? fmtClock(focusEvent.created_at) : '--:--:--' }}
            </b>
          </div>
          <div class="ro-sep"></div>
          <div class="ro-block">
            <span class="ro-l">Channel</span>
            <b class="ro-v">{{ entityType || 'All systems' }}</b>
          </div>
        </div>
      </div>

      <!-- oscilloscope -->
      <div
        class="rec-scope" ref="scopeEl"
        @pointerdown="scrubStart" @pointermove="scrubMove" @pointerup="scrubEnd"
        @pointerleave="scrubEnd" @pointercancel="scrubEnd"
        :class="{ scrubbing }"
      >
        <div class="scope-axis"><span>HI</span><span>LO</span></div>
        <div class="scope-plot">
          <svg class="scope-svg" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="recLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="var(--pay-treasury)" />
                <stop offset="35%" stop-color="var(--pay-mint)" />
                <stop offset="70%" stop-color="var(--pay-amber)" />
                <stop offset="100%" stop-color="var(--pay-treasury)" />
              </linearGradient>
              <linearGradient id="recArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--pay-mint)" stop-opacity="0.28" />
                <stop offset="100%" stop-color="var(--pay-mint)" stop-opacity="0" />
              </linearGradient>
            </defs>
            <!-- grid -->
            <line v-for="g in [30,60,90]" :key="g" class="scope-grid" x1="0" :y1="g" x2="1000" :y2="g" vector-effect="non-scaling-stroke" />
            <!-- waveform -->
            <template v-if="pts.length > 1">
              <path class="scope-fill" :d="areaPath" fill="url(#recArea)" />
              <path class="scope-line" :key="drawKey" :d="linePath" fill="none" pathLength="1"
                stroke="url(#recLine)" vector-effect="non-scaling-stroke" />
            </template>
            <line v-else-if="pts.length === 1" class="scope-flat" x1="0" y1="60" x2="1000" y2="60" vector-effect="non-scaling-stroke" />
          </svg>

          <!-- DOM overlay: sample beads (kept out of SVG so non-uniform scaling can't distort them) -->
          <button
            v-for="(p, i) in pts" :key="'b'+i" type="button"
            class="scope-bead" :class="[p.cls, { on: i === focusIdx }]"
            :style="{ left: pct(p.x) + '%', top: pctY(p.y) + '%' }"
            @click="jumpTo(i)" :title="beadTitle(i)"
          ></button>

          <!-- playhead -->
          <div v-if="pts.length" class="scope-head" :style="{ left: headLeft + '%' }">
            <span class="head-knob"></span>
          </div>

          <!-- perpetual scan sweep -->
          <div class="scope-scan" aria-hidden="true"></div>
          <div v-if="loading" class="scope-loadbar" aria-hidden="true"></div>
        </div>
      </div>

      <!-- channels + lens -->
      <div class="rec-controls">
        <div class="ctl-group channels">
          <span class="ctl-label">Channels</span>
          <button class="chan" :class="{ on: !entityType }" @click="setType(null)">
            <Activity :size="13" /> All
          </button>
          <button v-for="c in CHANNELS" :key="c.key" class="chan" :class="{ on: entityType === c.key }" @click="setType(c.key)">
            <component :is="c.icon" :size="13" /> {{ c.label }}
          </button>
        </div>
        <div class="ctl-group lenses">
          <span class="ctl-label">Lens</span>
          <button v-for="l in LENSES" :key="l.key" class="lens" :class="[l.key, { on: lens === l.key }]" @click="lens = l.key">
            <i class="lens-dot"></i>{{ l.label }}
          </button>
        </div>
      </div>
    </header>

    <!-- ═══════════════ EVENT TAPE ═══════════════ -->
    <div v-if="loading" class="tape-skel">
      <div v-for="i in 7" :key="i" class="pay-skel" style="height:46px" />
    </div>

    <PayEmptyState
      v-else-if="!tape.length"
      :icon="ScrollText"
      title="No signal on this channel"
      sub="Every pay-run transition, configuration change, approval and payslip access is recorded here — immutably." />

    <ol v-else class="rec-tape" ref="tapeEl">
      <template v-for="node in tape" :key="node.kind === 'day' ? 'd'+node.key : node.e.id">
        <li v-if="node.kind === 'day'" class="day-mark">
          <span class="dm-line"></span>
          <span class="dm-label">{{ node.label }}</span>
          <span class="dm-count">{{ node.count }} {{ node.count === 1 ? 'event' : 'events' }}</span>
          <span class="dm-line"></span>
        </li>

        <li
          v-else class="frame" :class="[actCls(node.e.action), { focus: node.fi === focusIdx }]"
          :ref="el => setFrameRef(el, node.fi)"
          :style="{ '--c': colorVar(actCls(node.e.action)), '--enter-d': enterDelay(node.fi) }"
          @click="jumpTo(node.fi)"
        >
          <div class="fr-time">
            <span class="ft-clock mono">{{ fmtClock(node.e.created_at) }}</span>
            <span class="ft-rel">{{ relTime(node.e.created_at) }}</span>
          </div>

          <div class="fr-rail">
            <span class="fr-node">
              <component :is="meta(node.e.action).glyph" :size="14" />
              <span class="node-ping"></span>
            </span>
          </div>

          <div class="fr-body">
            <div class="fr-head">
              <span class="fr-flag">{{ meta(node.e.action).flag }}</span>
              <span class="fr-entity"><component :is="chanIcon(node.e.entity_type)" :size="12" />{{ entityLabel(node.e.entity_type) }}</span>
              <span v-if="node.e.batch_id" class="fr-tag mono">batch · {{ shortId(node.e.batch_id) }}</span>
            </div>

            <div v-if="node.e.from_status || node.e.to_status" class="fr-flow">
              <span class="flow-from">{{ node.e.from_status || 'start' }}</span>
              <span class="flow-wire" aria-hidden="true"><i></i></span>
              <span class="flow-to">{{ node.e.to_status || 'end' }}</span>
            </div>

            <p v-if="node.e.note" class="fr-note">{{ node.e.note }}</p>

            <!-- decoded detail — reveals on the focused (centred / clicked) row -->
            <transition name="fr-detail">
              <div v-if="node.fi === focusIdx" class="fr-meta">
                <span class="mt"><em>ref</em><b class="mono">{{ shortId(node.e.entity_id) }}</b></span>
                <span class="mt"><em>actor</em><b>{{ actorLabel(node.e) }}</b></span>
                <span class="mt"><em>logged</em><b class="mono">{{ fmtFull(node.e.created_at) }}</b></span>
              </div>
            </transition>
          </div>
        </li>
      </template>
    </ol>

    <PayPagination
      v-if="!loading && total > 0"
      :page="page" :page-size="limit" :total-items="total"
      @update:page="p => { page = p; reload(true) }"
      @update:page-size="s => { limit = s; page = 1; reload(true) }" />
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import {
  Activity, ScrollText, Layers, FileText, Boxes, Puzzle, Wallet, Coins, SlidersHorizontal,
  Plus, PencilLine, RotateCcw, Sparkles, RefreshCw, ShieldCheck, Stamp, Banknote, Lock,
  Ban, Trash2, Undo2, Eye, Download,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PayEmptyState from '../components/PayEmptyState.vue'
import PayPagination from '../components/PayPagination.vue'
import PayCountUp from '../components/PayCountUp.vue'
import { fetchPayrollAudit } from '@/composables/usePayroll'

const toast = useToast()
const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/* ── action vocabulary → semantics ───────────────────────────────────── */
const ACTION_META = {
  CREATE:          { cls: 'mint',  flag: 'Created',      glyph: Plus,             lens: 'build',    amp: 0.42 },
  UPDATE:          { cls: 'mint',  flag: 'Updated',      glyph: PencilLine,       lens: 'build',    amp: 0.46 },
  CONFIG_CHANGE:   { cls: 'mint',  flag: 'Config',       glyph: SlidersHorizontal, lens: 'build',   amp: 0.5  },
  REOPEN:          { cls: 'amber', flag: 'Reopened',     glyph: RotateCcw,        lens: 'build',    amp: 0.58 },
  GENERATE:        { cls: 'amber', flag: 'Generated',    glyph: Sparkles,         lens: 'build',    amp: 0.64 },
  REGENERATE:      { cls: 'amber', flag: 'Regenerated',  glyph: RefreshCw,        lens: 'build',    amp: 0.6  },
  VERIFY:          { cls: 'amber', flag: 'Verified',     glyph: ShieldCheck,      lens: 'build',    amp: 0.66 },
  APPROVE:         { cls: 'net',   flag: 'Approved',     glyph: Stamp,            lens: 'signoff',  amp: 0.9  },
  RELEASE:         { cls: 'net',   flag: 'Released',     glyph: Banknote,         lens: 'signoff',  amp: 0.96 },
  LOCK:            { cls: 'bronze',flag: 'Locked',       glyph: Lock,             lens: 'reversal', amp: 0.72 },
  CANCEL:          { cls: 'ember', flag: 'Cancelled',    glyph: Ban,              lens: 'reversal', amp: 0.84 },
  DELETE:          { cls: 'ember', flag: 'Deleted',      glyph: Trash2,           lens: 'reversal', amp: 0.88 },
  RETURN:          { cls: 'ember', flag: 'Returned',     glyph: Undo2,            lens: 'reversal', amp: 0.8  },
  PAYSLIP_VIEW:    { cls: 'muted', flag: 'Viewed',       glyph: Eye,              lens: 'access',   amp: 0.2  },
  PAYSLIP_DOWNLOAD:{ cls: 'muted', flag: 'Downloaded',   glyph: Download,         lens: 'access',   amp: 0.26 },
}
const DEFAULT_META = { cls: 'mint', flag: 'Event', glyph: Activity, lens: 'build', amp: 0.4 }
const meta = (a) => ACTION_META[a] || DEFAULT_META
const actCls = (a) => meta(a).cls

const CHANNELS = [
  { key: 'BATCH', label: 'Batch', icon: Layers },
  { key: 'PAYSLIP', label: 'Payslip', icon: FileText },
  { key: 'STRUCTURE', label: 'Structure', icon: Boxes },
  { key: 'COMPONENT', label: 'Component', icon: Puzzle },
  { key: 'COMPENSATION', label: 'Comp', icon: Wallet },
  { key: 'ADJUSTMENT', label: 'Adjustment', icon: Coins },
  { key: 'CONFIG', label: 'Config', icon: SlidersHorizontal },
]
const CHAN_ICON = Object.fromEntries(CHANNELS.map(c => [c.key, c.icon]))
const chanIcon = (t) => CHAN_ICON[t] || Activity
const entityLabel = (t) => (CHANNELS.find(c => c.key === t)?.label) || (t ? t[0] + t.slice(1).toLowerCase() : '—')

const LENSES = [
  { key: 'all', label: 'All' },
  { key: 'signoff', label: 'Sign-off' },
  { key: 'build', label: 'Build & Run' },
  { key: 'reversal', label: 'Reversals' },
  { key: 'access', label: 'Access' },
]
const lens = ref('all')

const colorVar = (cls) => ({
  net: 'var(--pay-net)', amber: 'var(--pay-amber)', mint: 'var(--pay-mint)',
  ember: 'var(--pay-deduction)', bronze: 'var(--pay-statutory)', muted: 'var(--pay-text-muted)',
}[cls] || 'var(--pay-mint)')

/* ── data ─────────────────────────────────────────────────────────────── */
const items = ref([]); const total = ref(0); const loading = ref(false)
const entityType = ref(null); const page = ref(1); const limit = ref(50)

const reload = async (toTop = false) => {
  loading.value = true
  try {
    const res = await fetchPayrollAudit({
      entity_type: entityType.value || undefined,
      skip: (page.value - 1) * limit.value, limit: limit.value,
    })
    items.value = res.items || []; total.value = res.total || 0
  } catch { toast.error('Failed to load audit telemetry') }
  finally {
    loading.value = false
    focusIdx.value = 0; seen.clear(); frameEls.value = []
    await nextTick()
    if (toTop && tapeEl.value) tapeEl.value.scrollIntoView({ block: 'start', behavior: 'smooth' })
    revealMount(); measureFocus()
  }
}
const setType = (t) => { entityType.value = t; page.value = 1; reload(true) }

/* visible = loaded items filtered by lens (client-side view lens; the channel
   filter above is the real server-side, paginated filter) */
const visible = computed(() =>
  lens.value === 'all' ? items.value : items.value.filter(e => meta(e.action).lens === lens.value))

/* ── tape (with day dividers) ─────────────────────────────────────────── */
const dayKey = (s) => { const d = new Date(s); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` }
const tape = computed(() => {
  const out = []; let last = null; let fi = 0; let dayNode = null
  for (const e of visible.value) {
    const k = dayKey(e.created_at)
    if (k !== last) { dayNode = { kind: 'day', key: k, label: fmtDay(e.created_at), count: 0 }; out.push(dayNode); last = k }
    if (dayNode) dayNode.count++
    out.push({ kind: 'frame', e, fi: fi++ })
  }
  return out
})
const frameCount = computed(() => visible.value.length)

/* ── oscilloscope geometry ────────────────────────────────────────────── */
const W = 1000, H = 120, PAD = 14
const ampFor = (e, i) => {
  const base = meta(e.action).amp
  const jit = (((i * 37) % 11) / 11 - 0.5) * 0.1
  return Math.max(0.08, Math.min(0.97, base + jit))
}
const pts = computed(() => {
  const arr = visible.value; const n = arr.length
  return arr.map((e, i) => {
    const x = n <= 1 ? W / 2 : PAD + (i / (n - 1)) * (W - 2 * PAD)
    const y = (H - PAD) - ampFor(e, i) * (H - 2 * PAD)
    return { x, y, cls: actCls(e.action) }
  })
})
const linePath = computed(() => pts.value.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '))
const areaPath = computed(() => {
  const p = pts.value; if (p.length < 2) return ''
  return `M${p[0].x.toFixed(1)} ${H} ` + p.map(q => `L${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' ') + ` L${p[p.length - 1].x.toFixed(1)} ${H} Z`
})
const pct = (x) => (x / W) * 100
const pctY = (y) => (y / H) * 100
const headLeft = computed(() => { const p = pts.value[focusIdx.value]; return p ? pct(p.x) : 0 })
const drawKey = computed(() => `${page.value}-${lens.value}-${entityType.value}-${frameCount.value}`)
const focusEvent = computed(() => visible.value[focusIdx.value] || null)
const beadTitle = (i) => { const e = visible.value[i]; return e ? `${meta(e.action).flag} · ${fmtClock(e.created_at)}` : '' }

/* ── focus tracking (scroll-driven playhead) ──────────────────────────── */
const focusIdx = ref(0)
const seen = reactive(new Set())
const frameEls = ref([])
const setFrameRef = (el, fi) => { if (el) frameEls.value[fi] = el }

let raf = 0
const measureFocus = () => {
  const els = frameEls.value; if (!els.length) return
  const mid = window.innerHeight / 2
  let best = -1, bestD = Infinity
  for (let i = 0; i < els.length; i++) {
    const el = els[i]; if (!el) continue
    const r = el.getBoundingClientRect()
    if (r.top < window.innerHeight && r.bottom > 0 && !seen.has(i)) seen.add(i) // develop
    const d = Math.abs((r.top + r.bottom) / 2 - mid)
    if (d < bestD) { bestD = d; best = i }
  }
  if (best >= 0 && !scrubbing.value) focusIdx.value = best
}
const onScroll = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; measureFocus() }) }
const revealMount = () => { // reveal whatever is already on-screen at mount
  const els = frameEls.value
  for (let i = 0; i < els.length; i++) { const el = els[i]; if (!el) continue; const r = el.getBoundingClientRect(); if (r.top < window.innerHeight && r.bottom > 0) seen.add(i) }
}

/* ── scrub interactions ───────────────────────────────────────────────── */
const scopeEl = ref(null); const tapeEl = ref(null)
const scrubbing = ref(false)
const idxFromClientX = (clientX) => {
  const el = scopeEl.value?.querySelector('.scope-plot'); if (!el) return 0
  const r = el.getBoundingClientRect()
  const f = Math.max(0, Math.min(1, (clientX - r.left) / r.width))
  return Math.round(f * Math.max(0, frameCount.value - 1))
}
const jumpTo = (i) => {
  focusIdx.value = i
  frameEls.value[i]?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
}
const scrubStart = (e) => { if (!frameCount.value) return; scrubbing.value = true; scopeEl.value?.setPointerCapture?.(e.pointerId); focusIdx.value = idxFromClientX(e.clientX) }
const scrubMove = (e) => { if (!scrubbing.value) return; focusIdx.value = idxFromClientX(e.clientX) }
const scrubEnd = () => { if (!scrubbing.value) return; scrubbing.value = false; jumpTo(focusIdx.value) }

/* ── formatters ───────────────────────────────────────────────────────── */
const pad2 = (n) => String(n).padStart(2, '0')
const fmtClock = (s) => { const d = new Date(s); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}` }
const fmtDay = (s) => new Date(s).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const fmtFull = (s) => { try { return new Date(s).toLocaleString() } catch { return s } }
const relTime = (s) => {
  const diff = (Date.now() - new Date(s).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
const shortId = (id) => (id ? String(id).replace(/-/g, '').slice(0, 8) : '—')
const actorLabel = (e) => e.actor_name || (e.actor_id ? 'user · ' + shortId(e.actor_id) : 'System')
// Staggered one-shot entrance delay (capped) — rows are visible by default;
// this is decoration only, never a visibility gate.
const enterDelay = (i) => Math.min(i * 0.035, 0.6) + 's'

watch(frameCount, async () => {
  frameEls.value = []; seen.clear(); focusIdx.value = 0
  await nextTick(); revealMount(); measureFocus()
})

onMounted(() => {
  // capture:true so scroll events from the dashboard's inner scroll container
  // (which don't bubble to window) still drive the oscilloscope playhead.
  window.addEventListener('scroll', onScroll, { passive: true, capture: true })
  window.addEventListener('resize', onScroll, { passive: true })
  reload()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll, { capture: true })
  window.removeEventListener('resize', onScroll)
  if (raf) cancelAnimationFrame(raf)
})
</script>

<style scoped>
.rec { display: flex; flex-direction: column; gap: 16px; padding-top: 6px; }

/* ════════════ CONSOLE ════════════ */
.rec-console {
  position: relative; overflow: hidden;
  border: 1px solid var(--pay-border); border-radius: 20px;
  background:
    radial-gradient(140% 120% at 92% -20%, rgba(251,191,36,0.10), transparent 55%),
    linear-gradient(180deg, rgba(12,9,5,0.6), rgba(8,6,3,0.34));
  padding: 18px 20px 16px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 24px 60px -40px rgba(0,0,0,0.8);
}
.rec-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: radial-gradient(rgba(255,255,255,0.04) 0.5px, transparent 0.6px);
  background-size: 4px 4px; mix-blend-mode: overlay; }

.rec-top { position: relative; z-index: 2; display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; flex-wrap: wrap; }
.rec-id { display: flex; align-items: center; gap: 13px; }
.rec-led { position: relative; width: 13px; height: 13px; flex-shrink: 0; display: grid; place-items: center; }
.rec-led i { width: 9px; height: 9px; border-radius: 50%; background: var(--pay-text-muted); transition: background 0.3s; }
.rec-led.live i { background: var(--pay-ember); box-shadow: 0 0 10px 1px var(--pay-ember); animation: pay-dot-pulse 1.5s ease-in-out infinite; }
.rec-led.live::after { content: ''; position: absolute; inset: -3px; border-radius: 50%; border: 1px solid var(--pay-ember); opacity: 0; animation: pay-strike-ping 1.6s ease-out infinite; }
.rec-eyebrow { display: block; font-family: var(--pay-mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: var(--pay-treasury); }
.rec-title { margin: 2px 0 0; font-size: 19px; font-weight: 800; letter-spacing: -0.01em; color: var(--pay-text); }

.rec-readout { display: flex; align-items: center; gap: 16px; }
.ro-block { display: flex; flex-direction: column; gap: 2px; }
.ro-l { font-family: var(--pay-mono); font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--pay-text-muted); }
.ro-v { font-size: 16px; font-weight: 800; color: var(--pay-text); line-height: 1.1; }
.ro-v.mono { font-family: var(--pay-mono); font-size: 15px; }
.ro-v.net { color: var(--pay-net); } .ro-v.ember { color: var(--pay-deduction); } .ro-v.bronze { color: var(--pay-statutory); }
.ro-v.amber { color: var(--pay-amber); } .ro-v.muted { color: var(--pay-text-muted); }
.ro-sep { width: 1px; align-self: stretch; background: var(--pay-border-soft); }

/* oscilloscope */
.rec-scope { position: relative; z-index: 2; margin: 16px 0 14px; display: flex; gap: 10px; cursor: crosshair; touch-action: none; }
.rec-scope.scrubbing { cursor: grabbing; }
.scope-axis { display: flex; flex-direction: column; justify-content: space-between; padding: 6px 0; }
.scope-axis span { font-family: var(--pay-mono); font-size: 8px; letter-spacing: 0.1em; color: var(--pay-text-muted); }
.scope-plot {
  position: relative; flex: 1; height: 132px; border-radius: 14px; overflow: hidden;
  background: linear-gradient(180deg, rgba(4,3,2,0.55), rgba(10,8,5,0.32));
  border: 1px solid var(--pay-border-soft);
}
.scope-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.scope-grid { stroke: var(--pay-border-soft); stroke-width: 1; }
.scope-flat { stroke: var(--pay-text-muted); stroke-width: 1.5; stroke-dasharray: 4 5; opacity: 0.6; }
.scope-fill { opacity: 0; animation: pay-area-grow 1s var(--pay-ease) 0.15s forwards; }
.scope-line { stroke-width: 2; filter: drop-shadow(0 0 5px rgba(251,191,36,0.45));
  stroke-dasharray: 1; stroke-dashoffset: 1; animation: pay-draw 1.5s var(--pay-ease) forwards; }

/* sample beads */
.scope-bead { position: absolute; width: 7px; height: 7px; margin: -3.5px; padding: 0; border-radius: 50%;
  border: none; cursor: pointer; background: var(--pay-mint); transition: transform 0.22s var(--pay-spring), box-shadow 0.22s var(--pay-ease);
  box-shadow: 0 0 0 0 transparent; }
.scope-bead.net { background: var(--pay-net); } .scope-bead.amber { background: var(--pay-amber); }
.scope-bead.mint { background: var(--pay-mint); } .scope-bead.ember { background: var(--pay-deduction); }
.scope-bead.bronze { background: var(--pay-statutory); } .scope-bead.muted { background: var(--pay-text-muted); }
.scope-bead:hover { transform: scale(1.6); }
.scope-bead.on { transform: scale(2.1); box-shadow: 0 0 0 4px rgba(251,191,36,0.18), 0 0 12px 2px currentColor; }

/* playhead */
.scope-head { position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px;
  background: linear-gradient(180deg, transparent, var(--pay-mint-bright), var(--pay-amber), transparent);
  box-shadow: 0 0 12px 1px rgba(251,191,36,0.5); transition: left 0.32s var(--pay-ease); pointer-events: none; }
.scrubbing .scope-head { transition: none; }
.head-knob { position: absolute; top: -1px; left: 50%; width: 9px; height: 9px; margin-left: -4.5px; border-radius: 50%;
  background: var(--pay-mint-bright); box-shadow: 0 0 10px 2px var(--pay-amber); }

/* scan sweep + load bar */
.scope-scan { position: absolute; top: 0; bottom: 0; width: 30%; pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(251,191,36,0.10), rgba(251,191,36,0.16), transparent);
  transform: translateX(-120%); animation: scope-sweep 5.5s linear infinite; }
@keyframes scope-sweep { 0% { transform: translateX(-120%); } 100% { transform: translateX(360%); } }
.scope-loadbar { position: absolute; left: 0; bottom: 0; height: 2px; width: 40%;
  background: linear-gradient(90deg, transparent, var(--pay-amber), transparent); animation: scope-sweep 1.1s linear infinite; }

/* controls */
.rec-controls { position: relative; z-index: 2; display: flex; flex-wrap: wrap; gap: 18px 26px; align-items: center; }
.ctl-group { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.ctl-label { font-family: var(--pay-mono); font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--pay-text-muted); margin-right: 2px; }
.chan { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 9px; cursor: pointer;
  border: 1px solid var(--pay-border-soft); background: var(--pay-surface); color: var(--pay-text-2); font-size: 11px; font-weight: 600;
  transition: border-color 0.18s var(--pay-ease), color 0.18s var(--pay-ease), background 0.18s var(--pay-ease), transform 0.18s var(--pay-spring); }
.chan:hover { color: var(--pay-text); border-color: var(--pay-border); transform: translateY(-1px); }
.chan.on { background: rgba(251,191,36,0.13); color: var(--pay-mint); border-color: var(--pay-border); }
[data-theme="light"] .chan.on { color: var(--pay-treasury); }

.lens { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; cursor: pointer;
  border: 1px solid var(--pay-border-soft); background: transparent; color: var(--pay-text-muted); font-size: 11px; font-weight: 600;
  transition: color 0.18s, border-color 0.18s, background 0.18s; }
.lens .lens-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.lens.signoff { --ld: var(--pay-net); } .lens.build { --ld: var(--pay-amber); }
.lens.reversal { --ld: var(--pay-deduction); } .lens.access { --ld: var(--pay-text-muted); } .lens.all { --ld: var(--pay-treasury); }
.lens .lens-dot { background: var(--ld); }
.lens:hover { color: var(--pay-text-2); border-color: var(--pay-border); }
.lens.on { color: var(--pay-text); border-color: var(--pay-border); background: color-mix(in srgb, var(--ld) 14%, transparent); }

/* ════════════ TAPE ════════════ */
.tape-skel { display: flex; flex-direction: column; gap: 7px; }
.rec-tape { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }

.day-mark { display: flex; align-items: center; gap: 12px; padding: 10px 2px 4px; }
.dm-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, var(--pay-border-soft), transparent); }
.dm-label { font-family: var(--pay-mono); font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--pay-text-2); }
.dm-count { font-family: var(--pay-mono); font-size: 9.5px; color: var(--pay-text-muted); }

.frame {
  position: relative; display: grid; grid-template-columns: 78px 30px 1fr; align-items: start; gap: 14px;
  padding: 12px 16px 12px 12px; border-radius: 13px; cursor: pointer;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft);
  /* Visible by default — entrance is a one-shot animation (decoration only),
     NEVER a scroll-gated reveal, so no row can be left blank. Entrance touches
     opacity/filter only, leaving `transform` free for the hover lift. */
  opacity: 0; animation: rec-frame-in 0.5s var(--pay-ease) both; animation-delay: var(--enter-d, 0s);
  transition: border-color 0.25s var(--pay-ease), background 0.25s var(--pay-ease),
    box-shadow 0.3s var(--pay-ease), transform 0.28s var(--pay-spring);
}
@keyframes rec-frame-in {
  from { opacity: 0; filter: blur(5px); }
  to   { opacity: 1; filter: none; }
}
/* hover: a clean lift + accent rail that grows in + faint tint (no layout shift) */
.frame::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  border-radius: 13px 0 0 13px; background: var(--c); pointer-events: none;
  transform: scaleY(0); transform-origin: center; transition: transform 0.3s var(--pay-ease);
}
.frame:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--c) 45%, var(--pay-border));
  background: color-mix(in srgb, var(--c) 7%, var(--pay-surface));
  box-shadow: 0 14px 34px -22px var(--c);
}
.frame:hover::before { transform: scaleY(1); }
.frame.focus::before { transform: scaleY(0); }   /* focus has its own left bar */
.frame.focus { border-color: color-mix(in srgb, var(--c) 50%, var(--pay-border));
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 9%, var(--pay-surface)), var(--pay-surface));
  box-shadow: -3px 0 0 0 var(--c), 0 14px 38px -24px var(--c); }

.fr-time { display: flex; flex-direction: column; gap: 2px; padding-top: 2px; }
.ft-clock { font-size: 13px; font-weight: 700; color: var(--pay-text); letter-spacing: -0.01em; }
.ft-rel { font-size: 9.5px; color: var(--pay-text-muted); font-family: var(--pay-mono); }

.fr-rail { display: flex; justify-content: center; padding-top: 1px; }
.fr-node { position: relative; width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 35%, transparent);
  transition: transform 0.3s var(--pay-spring); }
.frame.focus .fr-node { transform: scale(1.12) rotate(-4deg); }
.node-ping { position: absolute; inset: -1px; border-radius: inherit; border: 1.5px solid var(--c); opacity: 0; }
.frame.focus .node-ping { animation: pay-strike-ping 1.4s ease-out infinite; }

.fr-body { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.fr-head { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.fr-flag { font-size: 12px; font-weight: 800; letter-spacing: 0.01em; color: var(--c); }
.fr-entity { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: var(--pay-text-2);
  padding: 2px 8px; border-radius: 6px; background: rgba(255,255,255,0.04); border: 1px solid var(--pay-border-soft); }
[data-theme="light"] .fr-entity { background: rgba(40,25,10,0.05); }
.fr-tag { font-size: 10px; color: var(--pay-text-muted); }

.fr-flow { display: inline-flex; align-items: center; gap: 0; align-self: flex-start; }
.flow-from, .flow-to { font-family: var(--pay-mono); font-size: 10.5px; font-weight: 600; padding: 2px 9px; border-radius: 6px;
  background: rgba(255,255,255,0.04); color: var(--pay-text-2); border: 1px solid var(--pay-border-soft); }
[data-theme="light"] .flow-from, [data-theme="light"] .flow-to { background: rgba(40,25,10,0.05); }
.flow-to { color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); border-color: color-mix(in srgb, var(--c) 30%, transparent); }
.flow-wire { position: relative; width: 34px; height: 2px; margin: 0 -2px; background: var(--pay-border-soft); overflow: hidden; }
.flow-wire i { position: absolute; top: 0; left: 0; height: 100%; width: 40%;
  background: linear-gradient(90deg, transparent, var(--c), transparent); animation: flow-travel 1.5s linear infinite; }
@keyframes flow-travel { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }

.fr-note { margin: 0; font-size: 12px; line-height: 1.5; color: var(--pay-text-2); }

.fr-meta { display: flex; flex-wrap: wrap; gap: 7px 16px; margin-top: 3px; padding-top: 9px; border-top: 1px dashed var(--pay-border-soft); }
.mt { display: inline-flex; align-items: baseline; gap: 6px; }
.mt em { font-style: normal; font-family: var(--pay-mono); font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--pay-text-muted); }
.mt b { font-size: 11.5px; font-weight: 600; color: var(--pay-text); }
.mt b.mono { font-family: var(--pay-mono); font-size: 11px; }

.fr-detail-enter-active, .fr-detail-leave-active { transition: opacity 0.3s var(--pay-ease), max-height 0.32s var(--pay-ease); overflow: hidden; }
.fr-detail-enter-from, .fr-detail-leave-to { opacity: 0; max-height: 0; }
.fr-detail-enter-to, .fr-detail-leave-from { opacity: 1; max-height: 80px; }

/* ════════════ LIGHT THEME ════════════ */
[data-theme="light"] .rec-console {
  background:
    radial-gradient(140% 120% at 92% -20%, rgba(245,158,11,0.10), transparent 55%),
    linear-gradient(180deg, rgba(255,252,245,0.9), rgba(255,250,240,0.7));
}
[data-theme="light"] .rec-grain { mix-blend-mode: multiply; opacity: 0.35;
  background-image: radial-gradient(rgba(40,25,10,0.05) 0.5px, transparent 0.6px); }
[data-theme="light"] .scope-plot {
  background: linear-gradient(180deg, rgba(255,252,245,0.9), rgba(250,244,232,0.6));
  border-color: var(--pay-border); }
[data-theme="light"] .scope-line { filter: drop-shadow(0 0 3px rgba(217,119,6,0.3)); }
[data-theme="light"] .scope-scan { background: linear-gradient(90deg, transparent, rgba(217,119,6,0.07), rgba(217,119,6,0.12), transparent); }
[data-theme="light"] .fr-flow .flow-from, [data-theme="light"] .fr-flow .flow-to,
[data-theme="light"] .fr-entity { border-color: var(--pay-border); }

/* ════════════ REDUCED MOTION ════════════ */
.rec.reduced .scope-scan, .rec.reduced .scope-loadbar,
.rec.reduced .rec-led.live i, .rec.reduced .rec-led.live::after,
.rec.reduced .scope-line, .rec.reduced .scope-fill,
.rec.reduced .node-ping, .rec.reduced .flow-wire i { animation: none !important; }
.rec.reduced .scope-line { stroke-dashoffset: 0; }
.rec.reduced .scope-fill { opacity: 1; }
.rec.reduced .frame { opacity: 1; animation: none; transform: none; filter: none; transition: border-color 0.2s, background 0.2s; }
.rec.reduced .frame::before { transition: none; }
.rec.reduced .scope-head { transition: none; }

/* ════════════ RESPONSIVE ════════════ */
@media (max-width: 760px) {
  .rec-readout { gap: 12px; width: 100%; }
  .frame { grid-template-columns: 1fr; gap: 8px; }
  .fr-rail { display: none; }
  .fr-time { flex-direction: row; align-items: baseline; gap: 8px; }
}
</style>
