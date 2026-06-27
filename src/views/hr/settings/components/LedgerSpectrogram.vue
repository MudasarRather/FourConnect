<template>
  <!-- "Provenance Deck" — the governance ledger's signature instrument.
       A change-density spectrogram: action-lanes × the last 14 days, with a
       NOW playhead + a slow playback sweep, sitting above a proportional
       domain-spectrum bar. Distinct from the Asset ledger's pulse ribbon. -->
  <Motion as="section" class="lsp" :class="{ live: !reduced }" ref="rootEl"
    :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <span class="lsp-grain" aria-hidden="true" />
    <span class="lsp-aura" aria-hidden="true" />
    <span class="lsp-floor" aria-hidden="true" />

    <header class="lsp-hud">
      <span class="lsp-hud-l">
        <span class="lsp-hud-dot" />
        <b>Provenance deck</b>
        <span class="lsp-hud-sep">·</span>
        <span class="lsp-hud-sub">14-day change density</span>
      </span>
      <span class="lsp-clock">
        <span class="lsp-clock-live">● SEALED</span>
        <b class="set-mono">{{ clock }}</b>
      </span>
    </header>

    <div v-if="loading" class="lsp-skel"><span class="lsp-skel-beam" /></div>

    <template v-else>
      <!-- ── heatmap matrix ─────────────────────────────────────────────── -->
      <div class="lsp-matrix" :style="{ '--cols': DAYS }">
        <span class="lsp-sweep" aria-hidden="true" />
        <div v-for="(lane, li) in lanes" :key="lane.key" class="lsp-lane" :style="{ '--lc': lane.color }">
          <div class="lsp-lane-head">
            <span class="lsp-lane-dot" />
            <span class="lsp-lane-name">{{ lane.label }}</span>
            <b class="lsp-lane-tot set-mono">{{ lane.total }}</b>
          </div>
          <div class="lsp-cells">
            <span v-for="(c, ci) in lane.cells" :key="c.key" class="lsp-cell"
              :class="{ hot: c.count > 0, peak: c.peak, today: ci === DAYS - 1 }"
              :style="{ '--in': c.intensity.toFixed(3), '--d': (ci * 0.022 + li * 0.05).toFixed(3) + 's' }"
              :title="`${lane.label} · ${c.label}: ${c.count} change${c.count === 1 ? '' : 's'}`" />
          </div>
        </div>

        <!-- NOW playhead over the final column -->
        <span class="lsp-playhead" aria-hidden="true"><i /></span>

        <div class="lsp-axis">
          <span v-for="(t, i) in axisTicks" :key="i" class="lsp-tick" :style="{ left: t.pos + '%' }">{{ t.label }}</span>
        </div>
      </div>

      <!-- ── domain spectrum ────────────────────────────────────────────── -->
      <div class="lsp-spectrum">
        <div class="lsp-spec-top">
          <span class="lsp-spec-cap">Domains touched</span>
          <span class="lsp-spec-meta">
            <b>{{ domainSegments.length }}</b> of {{ totalDomains }} ·
            <b>{{ actorCount }}</b> actor{{ actorCount === 1 ? '' : 's' }}
          </span>
        </div>
        <div class="lsp-bar" :class="{ empty: !rows.length }">
          <span v-for="s in domainSegments" :key="s.slug" class="lsp-seg"
            :style="{ width: s.pct + '%', '--sc': s.color }" :title="`${s.label}: ${s.count}`" />
        </div>
        <div class="lsp-legend">
          <span v-for="s in domainSegments" :key="s.slug" class="lsp-leg" :style="{ '--sc': s.color }">
            <span class="lsp-leg-dot" />{{ s.label }} <b class="set-mono">{{ s.count }}</b>
          </span>
          <span v-if="!rows.length" class="lsp-leg muted">Awaiting the first configuration change…</span>
        </div>
      </div>
    </template>
  </Motion>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  rows: { type: Array, default: () => [] },        // enriched rows (full loaded set)
  totalDomains: { type: Number, default: 14 },
  loading: { type: Boolean, default: false },
})

const DAYS = 14
const reduced = prefersReduced()
const rootEl = ref(null)
usePointerSpotlight(rootEl)

const LANES = [
  { key: 'CREATE', label: 'Created', color: 'var(--set-ok)' },
  { key: 'UPDATE', label: 'Updated', color: 'var(--set-gold)' },
  { key: 'DELETE', label: 'Removed', color: 'var(--set-conflict)' },
  { key: 'CONFIG', label: 'Config / statutory', color: 'var(--set-orange)' },
]

const localKey = (d) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

const cols = computed(() => {
  const out = []
  const today = new Date(); today.setHours(0, 0, 0, 0)
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    out.push({ key: localKey(d), date: d, label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) })
  }
  return out
})

// matrix[laneKey][dayKey] = count
const matrix = computed(() => {
  const m = {}
  for (const l of LANES) m[l.key] = {}
  for (const r of props.rows) {
    const lane = r._act?.key || 'UPDATE'
    if (!m[lane]) continue
    const k = r._date ? localKey(r._date) : null
    if (!k) continue
    m[lane][k] = (m[lane][k] || 0) + 1
  }
  return m
})

const peak = computed(() => {
  let mx = 0
  for (const l of LANES) for (const c of cols.value) mx = Math.max(mx, matrix.value[l.key][c.key] || 0)
  return mx || 1
})

const lanes = computed(() => LANES.map(l => {
  let total = 0
  const cells = cols.value.map(c => {
    const count = matrix.value[l.key][c.key] || 0
    total += count
    return {
      key: l.key + c.key, count, label: c.label,
      intensity: count ? 0.18 + 0.82 * Math.sqrt(count / peak.value) : 0,
      peak: count === peak.value && count > 0,
    }
  })
  return { ...l, total, cells }
}))

const axisTicks = computed(() => {
  // first, ~middle, last
  const idxs = [0, Math.floor((DAYS - 1) / 2), DAYS - 1]
  return idxs.map(i => ({ label: cols.value[i].label, pos: (i / (DAYS - 1)) * 100 }))
})

// domain spectrum — top 6 + "other"
const domainSegments = computed(() => {
  if (!props.rows.length) return []
  const by = {}
  for (const r of props.rows) {
    const slug = r._dom?.slug || 'other'
    if (!by[slug]) by[slug] = { slug, label: r._dom?.label || 'Other', color: r._dom?.accent || 'var(--set-unset)', count: 0 }
    by[slug].count++
  }
  let arr = Object.values(by).sort((a, b) => b.count - a.count)
  if (arr.length > 6) {
    const head = arr.slice(0, 6)
    const tail = arr.slice(6)
    head.push({ slug: 'other', label: 'Other', color: 'var(--set-unset)', count: tail.reduce((s, x) => s + x.count, 0) })
    arr = head
  }
  const tot = arr.reduce((s, x) => s + x.count, 0) || 1
  return arr.map(x => ({ ...x, pct: (x.count / tot) * 100 }))
})

const actorCount = computed(() => new Set(props.rows.map(r => r.actor_name || 'System')).size)

const clock = ref('--:--:--')
const tick = () => { try { clock.value = new Date().toLocaleTimeString('en-GB', { hour12: false }) } catch { /* noop */ } }
let timer = null
onMounted(() => { tick(); timer = setInterval(tick, 1000) })
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
.lsp {
  position: relative; overflow: hidden; border-radius: 20px;
  padding: 16px 18px 18px;
  background: var(--set-surface); border: 1px solid var(--set-border);
  box-shadow: var(--set-card-shadow);
}
.lsp-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.5; z-index: 0;
  background-image: linear-gradient(color-mix(in srgb, var(--set-gold) 6%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--set-gold) 6%, transparent) 1px, transparent 1px);
  background-size: 28px 28px; mask-image: radial-gradient(130% 120% at 8% 0%, #000 12%, transparent 76%);
  -webkit-mask-image: radial-gradient(130% 120% at 8% 0%, #000 12%, transparent 76%); }
.lsp-aura { position: absolute; inset: -40% 30% auto -8%; height: 90%; pointer-events: none; z-index: 0;
  background: radial-gradient(circle, color-mix(in srgb, var(--set-gold) 18%, transparent), transparent 70%); filter: blur(40px);
  transform: translateX(calc((var(--mx, 0.5) - 0.5) * -18px)); }
.lsp-floor { position: absolute; inset: auto 0 0 0; height: 38%; pointer-events: none; z-index: 0; opacity: 0.32;
  background-image: linear-gradient(color-mix(in srgb, var(--set-gold) 8%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--set-gold) 6%, transparent) 1px, transparent 1px);
  background-size: 38px 20px; transform: perspective(420px) rotateX(62deg); transform-origin: bottom;
  mask-image: linear-gradient(to top, #000, transparent); -webkit-mask-image: linear-gradient(to top, #000, transparent); }

.lsp-hud { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.lsp-hud-l { display: inline-flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--set-text-dim); }
.lsp-hud-l b { color: var(--set-gold); }
.lsp-hud-sub { color: var(--set-text-secondary); }
.lsp-hud-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--set-ok); box-shadow: 0 0 9px var(--set-ok); animation: set-led-pulse 2s ease-in-out infinite; }
.lsp-clock { display: inline-flex; align-items: center; gap: 9px; }
.lsp-clock-live { font-size: 8px; font-weight: 850; letter-spacing: 0.12em; color: var(--set-ok); }
.lsp-clock b { font-size: 12.5px; font-weight: 800; letter-spacing: 0.14em; color: var(--set-text-secondary);
  padding: 3px 9px; border-radius: 8px; background: var(--set-panel); border: 1px solid var(--set-border); }

/* ── matrix ───────────────────────────────────────────────────────────────── */
.lsp-matrix { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 7px; padding-bottom: 22px; }
.lsp-sweep { position: absolute; inset: 0 0 22px 0; z-index: 3; pointer-events: none; border-radius: 10px; overflow: hidden; }
.lsp.live .lsp-sweep::after { content: ''; position: absolute; top: 0; bottom: 0; width: 26%;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--set-gold) 14%, transparent), transparent);
  animation: lsp-sweep 6.5s ease-in-out infinite; }
@keyframes lsp-sweep { 0% { left: -28%; } 100% { left: 102%; } }

.lsp-lane { display: grid; grid-template-columns: 132px 1fr; align-items: center; gap: 12px; }
.lsp-lane-head { display: inline-flex; align-items: center; gap: 7px; min-width: 0; }
.lsp-lane-dot { width: 8px; height: 8px; border-radius: 2px; background: var(--lc); box-shadow: 0 0 8px color-mix(in srgb, var(--lc) 70%, transparent); flex-shrink: 0; }
.lsp-lane-name { font-size: 11.5px; font-weight: 700; color: var(--set-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lsp-lane-tot { margin-left: auto; font-size: 11px; font-weight: 800; color: var(--set-text-muted); }
.lsp-cells { display: grid; grid-template-columns: repeat(var(--cols), 1fr); gap: 4px; }
.lsp-cell { aspect-ratio: 1 / 1; border-radius: 4px; border: 1px solid var(--set-border);
  background: color-mix(in srgb, var(--lc) calc(var(--in) * 88%), transparent);
  transition: transform 0.18s var(--set-spring), box-shadow 0.18s; }
.lsp-cell.hot { border-color: color-mix(in srgb, var(--lc) 42%, transparent); }
.lsp-cell.peak { box-shadow: 0 0 12px -1px color-mix(in srgb, var(--lc) 80%, transparent); }
.lsp-cell.today { outline: 1px solid color-mix(in srgb, var(--lc) 30%, transparent); outline-offset: 1px; }
.lsp-cell:hover { transform: scale(1.18); box-shadow: 0 0 14px -1px color-mix(in srgb, var(--lc) 85%, transparent); z-index: 4; }
.lsp.live .lsp-cell { opacity: 0; animation: lsp-ignite 0.5s var(--set-spring) forwards; animation-delay: var(--d); }
@keyframes lsp-ignite { from { opacity: 0; transform: scale(0.4); } to { opacity: 1; transform: scale(1); } }

.lsp-playhead { position: absolute; top: -2px; bottom: 20px; right: 0;
  width: calc((100% - 144px) / var(--cols)); z-index: 4; pointer-events: none; }
.lsp-playhead i { position: absolute; right: 0; top: 0; bottom: 0; width: 2px; border-radius: 2px;
  background: linear-gradient(180deg, var(--set-gold-bright), transparent);
  box-shadow: 0 0 12px var(--set-gold); }
.lsp.live .lsp-playhead i { animation: lsp-ph 2.6s ease-in-out infinite; }
@keyframes lsp-ph { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }

.lsp-axis { position: absolute; left: 144px; right: 0; bottom: 0; height: 14px; }
.lsp-tick { position: absolute; transform: translateX(-50%); font-size: 8.5px; font-weight: 700; letter-spacing: 0.04em; color: var(--set-text-dim); white-space: nowrap; }
.lsp-tick:first-child { transform: none; left: 0 !important; }
.lsp-tick:last-child { transform: translateX(-100%); }

/* ── domain spectrum ──────────────────────────────────────────────────────── */
.lsp-spectrum { position: relative; z-index: 2; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--set-border); }
.lsp-spec-top { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
.lsp-spec-cap { font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--set-text-dim); }
.lsp-spec-meta { font-size: 11px; color: var(--set-text-muted); }
.lsp-spec-meta b { color: var(--set-text-secondary); font-weight: 750; }
.lsp-bar { display: flex; gap: 2px; height: 12px; border-radius: 6px; overflow: hidden; background: var(--set-trace-idle); }
.lsp-bar.empty { background: var(--set-trace-idle); }
.lsp-seg { height: 100%; background: var(--sc); border-radius: 2px; transition: width 0.7s var(--set-spring);
  animation: lsp-seg-in 0.7s var(--set-spring) backwards; }
@keyframes lsp-seg-in { from { transform: scaleX(0); transform-origin: left; } to { transform: scaleX(1); } }
.lsp-legend { display: flex; flex-wrap: wrap; gap: 5px 14px; margin-top: 10px; }
.lsp-leg { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--set-text-muted); }
.lsp-leg b { color: var(--set-text-secondary); font-weight: 750; }
.lsp-leg.muted { color: var(--set-text-dim); font-style: italic; }
.lsp-leg-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--sc); box-shadow: 0 0 7px color-mix(in srgb, var(--sc) 65%, transparent); }

.lsp-skel { position: relative; overflow: hidden; height: 230px; border-radius: 14px; background: var(--set-panel); }
.lsp-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, color-mix(in srgb, var(--set-gold) 11%, transparent) 50%, transparent 70%); background-size: 220% 100%; animation: set-sheen 1.5s ease infinite; }

@media (max-width: 720px) {
  .lsp-lane { grid-template-columns: 96px 1fr; }
  .lsp-axis { left: 108px; }
  .lsp-playhead { width: calc((100% - 108px) / var(--cols)); }
}
@media (prefers-reduced-motion: reduce) {
  .lsp-cell { opacity: 1 !important; animation: none !important; }
  .lsp-sweep::after, .lsp-playhead i, .lsp-hud-dot, .lsp-seg { animation: none !important; }
}
</style>
