<template>
  <Motion as="section" class="dp trv-grain" ref="rootEl"
    :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <span class="dp-aura" aria-hidden="true" />
    <span class="dp-glare" aria-hidden="true" />

    <!-- ══ The press — a sheet being typeset, print head sweeping down ══ -->
    <div class="dp-press">
      <div class="dp-platen"><span class="dp-roller" /></div>
      <div class="dp-sheet">
        <span class="dp-printbar" />
        <div class="dp-sheet-head">
          <span class="dp-dot" /><span class="dp-dot" /><span class="dp-dot" />
          <span class="dp-mast">DISPATCH · OPERATIONS BRIEF</span>
        </div>
        <div class="dp-lines">
          <span v-for="i in 7" :key="i" class="dp-line" :style="lineStyle(i)" />
        </div>
        <span class="dp-stamp">READY</span>
      </div>
    </div>

    <!-- ══ Dispatch throughput — real monthly volume printed as a filmstrip ══ -->
    <div class="dp-feed">
      <div class="dp-feed-head">
        <div class="dp-feed-lead">
          <span class="dp-eyebrow"><Printer :size="12" /> Dispatch throughput</span>
          <span class="dp-feed-sub">{{ rangeLabel }}</span>
        </div>
        <div class="dp-total">
          <span class="dp-total-v"><TrvCountUp :value="recordsIndexed" /></span>
          <span class="dp-total-l">records indexed</span>
        </div>
      </div>

      <div class="dp-strip" :class="{ idle: maxTours === 0 }">
        <Motion v-for="(m, i) in strip" :key="i" as="div" class="dp-page"
          :class="{ peak: m.tours === maxTours && maxTours > 0 }"
          :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, delay: 0.04 * i, ease: [0.16, 1, 0.3, 1] }">
          <span class="dp-page-bar" :style="{ height: barH(m, i) + '%' }">
            <span class="dp-page-fill" />
          </span>
          <span class="dp-page-n">{{ m.tours || '' }}</span>
          <span class="dp-page-lab">{{ m.label }}</span>
        </Motion>
      </div>

      <div v-if="statusMix.length" class="dp-mix">
        <span v-for="s in statusMix.slice(0, 6)" :key="s.key" class="dp-chip" :style="{ '--c': s.hex }">
          <i /> {{ pretty(s.key) }} <b>{{ s.n }}</b>
        </span>
      </div>
      <div v-else class="dp-mix dp-mix-empty">
        <Sparkles :size="13" /> No request activity in this window yet — the press idles, ready to compose.
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Printer, Sparkles } from 'lucide-vue-next'
import TrvCountUp from './TrvCountUp.vue'
import { usePointerSpotlight, seededWave } from '@/composables/useShiftMotion'

const props = defineProps({
  overview: { type: Object, default: () => ({}) },
})

const rootEl = ref(null)
usePointerSpotlight(rootEl)

const monthly = computed(() => props.overview?.monthly || [])
const statusMix = computed(() => props.overview?.status_mix || [])
const counts = computed(() => props.overview?.counts || {})
const recordsIndexed = computed(() => Object.values(counts.value).reduce((a, b) => a + (Number(b) || 0), 0))
const maxTours = computed(() => monthly.value.reduce((m, x) => Math.max(m, Number(x.tours) || 0), 0))

// Never show more than ~14 buckets; if empty, fabricate a quiet idle filmstrip.
const strip = computed(() => {
  const m = monthly.value
  if (m.length) return m.slice(-14)
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return labels.map(l => ({ label: l, tours: 0 }))
})

const rangeLabel = computed(() => {
  const f = props.overview?.from, t = props.overview?.to
  if (!f || !t) return 'Across the reporting window'
  const fmt = (s) => { try { return new Date(s).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) } catch { return s } }
  return `${fmt(f)} → ${fmt(t)}`
})

// Proportional bar height; when there's no data, a deterministic idle wave so
// the instrument never reads as broken/flat.
const barH = (m, i) => {
  if (maxTours.value > 0) return Math.max(8, Math.round((Number(m.tours) || 0) / maxTours.value * 100))
  return Math.round(18 + seededWave(7, strip.value.length)[i % strip.value.length] * 42)
}
const lineStyle = (i) => {
  const widths = [94, 80, 88, 66, 83, 56, 74]
  return { '--i': i, width: widths[(i - 1) % widths.length] + '%' }
}
const pretty = (k) => String(k || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
</script>

<style scoped>
.dp {
  position: relative; overflow: hidden; isolation: isolate;
  display: grid; grid-template-columns: minmax(240px, 0.92fr) 1.4fr; gap: 22px;
  padding: 20px 22px; border-radius: 20px; margin-top: 18px;
  background: linear-gradient(150deg, rgba(20,18,16,0.5), rgba(12,11,13,0.2));
  border: 1px solid var(--trv-border); box-shadow: var(--trv-card-shadow);
}
.dp-aura { position: absolute; inset: -40% 30% 20% -10%; z-index: 0; pointer-events: none;
  background: radial-gradient(60% 80% at 20% 10%, rgba(251,146,60,0.16), transparent 70%);
  animation: trv-aura-drift 12s ease-in-out infinite; }
.dp-glare { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: var(--spot, 0);
  transition: opacity 0.4s; background: radial-gradient(420px circle at calc(var(--mx,0.5)*100%) calc(var(--my,0.5)*100%), rgba(251,191,36,0.1), transparent 60%); }

/* ── press ── */
.dp-press { position: relative; z-index: 1; }
.dp-platen { position: relative; height: 14px; border-radius: 7px; overflow: hidden;
  background: linear-gradient(180deg, #2a2620, #16130e); border: 1px solid var(--trv-border-strong); margin: 0 6px 9px; }
.dp-roller { position: absolute; inset: 0;
  background: repeating-linear-gradient(180deg, rgba(251,191,36,0.32) 0 4px, transparent 4px 11px);
  animation: trv-platen-roll 0.9s linear infinite; }
.dp-sheet { position: relative; --trv-sweep-h: 150px; overflow: hidden; border-radius: 12px; padding: 14px 15px 16px;
  background: linear-gradient(180deg, var(--trv-pass), rgba(255,255,255,0.02));
  border: 1px solid var(--trv-pass-edge); box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 26px rgba(0,0,0,0.32); }
.dp-printbar { position: absolute; left: 8px; right: 8px; top: 8px; height: 18px; border-radius: 6px; z-index: 2;
  background: linear-gradient(180deg, rgba(251,191,36,0.42), rgba(251,146,60,0.06));
  box-shadow: 0 0 16px 2px rgba(251,191,36,0.45); animation: trv-print-sweep 2.8s var(--trv-ease) infinite; }
.dp-sheet-head { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
.dp-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--trv-amber); opacity: 0.55; }
.dp-mast { margin-left: 6px; font-family: var(--trv-mono); font-size: 9.5px; letter-spacing: 0.18em; color: var(--trv-amber); }
.dp-lines { display: flex; flex-direction: column; gap: 9px; }
.dp-line { height: 7px; border-radius: 4px; transform-origin: left; background: linear-gradient(90deg, var(--trv-text-muted), rgba(140,139,136,0.18));
  animation: trv-line-print 2.8s var(--trv-ease) infinite; animation-delay: calc(var(--i) * 0.16s); }
.dp-stamp { position: absolute; right: 14px; bottom: 12px; font-family: var(--trv-mono); font-size: 11px; font-weight: 800;
  letter-spacing: 0.2em; color: var(--trv-st-approved); padding: 3px 9px; border-radius: 6px;
  border: 1.5px solid var(--trv-st-approved); background: var(--trv-st-approved-soft);
  animation: trv-press-stamp 2.8s ease-in-out infinite; }

/* ── feed ── */
.dp-feed { position: relative; z-index: 1; display: flex; flex-direction: column; }
.dp-feed-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.dp-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700;
  letter-spacing: 0.13em; text-transform: uppercase; color: var(--trv-amber); }
.dp-feed-sub { display: block; font-size: 11.5px; color: var(--trv-text-muted); margin-top: 3px; }
.dp-total { text-align: right; line-height: 1; }
.dp-total-v { font-size: 26px; font-weight: 850; color: var(--trv-text); font-variant-numeric: tabular-nums;
  background: var(--trv-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.dp-total-l { display: block; font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trv-text-dim); margin-top: 3px; }

.dp-strip { display: flex; align-items: flex-end; gap: 6px; height: 92px; padding: 6px 2px 0;
  border-bottom: 1px solid var(--trv-border); margin-bottom: 12px; }
.dp-page { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; gap: 3px; }
.dp-page-bar { position: relative; width: 100%; max-width: 26px; border-radius: 5px 5px 2px 2px; overflow: hidden;
  background: rgba(255,255,255,0.05); border: 1px solid var(--trv-border); transition: height 0.6s var(--trv-spring); }
.dp-page-fill { position: absolute; inset: 0; background: linear-gradient(180deg, var(--trv-amber), var(--trv-ember));
  opacity: 0.5; }
.dp-page.peak .dp-page-bar { box-shadow: 0 0 14px -2px rgba(251,191,36,0.6); border-color: var(--trv-amber-border); }
.dp-page.peak .dp-page-fill { opacity: 1; }
.dp-strip.idle .dp-page-fill { opacity: 0.22; }
.dp-page-n { font-size: 9px; font-weight: 800; color: var(--trv-amber); font-variant-numeric: tabular-nums; min-height: 11px; }
.dp-page-lab { font-size: 8.5px; color: var(--trv-text-dim); }

.dp-mix { display: flex; flex-wrap: wrap; gap: 6px; }
.dp-chip { --c: var(--trv-amber); display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 600;
  padding: 4px 9px; border-radius: 999px; color: var(--trv-text-secondary); background: var(--trv-panel); border: 1px solid var(--trv-border); }
.dp-chip i { width: 7px; height: 7px; border-radius: 50%; background: var(--c); box-shadow: 0 0 6px var(--c); }
.dp-chip b { color: var(--c); font-weight: 800; }
.dp-mix-empty { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--trv-text-muted); }
.dp-mix-empty :deep(svg) { color: var(--trv-amber); }

[data-theme="light"] .dp { background: linear-gradient(150deg, rgba(255,248,236,0.7), rgba(255,252,246,0.4)); }
[data-theme="light"] .dp-platen { background: linear-gradient(180deg, #e7d9bd, #c8b390); }
[data-theme="light"] .dp-page-bar { background: rgba(120,90,30,0.08); }

@media (max-width: 760px) { .dp { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  .dp-aura, .dp-roller, .dp-printbar, .dp-line, .dp-stamp { animation: none !important; }
  .dp-printbar { opacity: 0.5; top: 50%; }
  .dp-line { transform: scaleX(1); opacity: 0.8; }
}
</style>
