<template>
  <!-- ═══ "Concourse Atlas" — the travel-taxonomy terminal ═══
       Gate-pylon skyline whose heights track each category's share of tours,
       a coverage gauge for the whole taxonomy, a shuttle of light gliding the
       concourse rail, and boarding pulses rising inside the busiest gates.
       A signature distinct from every sibling travel tab. -->
  <div ref="root" class="cc-atlas trv-grain">
    <span class="cc-aura" aria-hidden="true" />
    <span class="cc-floor" aria-hidden="true" />

    <!-- ── coverage gauge + totals ── -->
    <div class="cc-gauge">
      <div class="cc-arc-wrap">
        <svg class="cc-arc" viewBox="0 0 200 116" aria-hidden="true">
          <defs>
            <linearGradient id="ccArcGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#fbbf24" /><stop offset="55%" stop-color="#fb923c" /><stop offset="100%" stop-color="#f97316" />
            </linearGradient>
          </defs>
          <path class="cc-arc-track" d="M16,104 A88,88 0 0 1 184,104" />
          <path class="cc-arc-val" d="M16,104 A88,88 0 0 1 184,104"
            :style="{ strokeDashoffset: arcOffset }" />
          <!-- tick marks -->
          <g class="cc-ticks">
            <line v-for="t in 9" :key="t" :transform="`rotate(${-90 + (t - 1) * 22.5} 100 104)`"
              x1="100" y1="22" x2="100" y2="30" />
          </g>
        </svg>
        <div class="cc-gauge-core">
          <span class="cc-core-eyebrow"><Radio :size="11" /> Classified tours</span>
          <span class="cc-core-val"><TrvCountUp :value="totalTours" /></span>
        </div>
      </div>
      <!-- readouts flow below the arc so nothing overlaps the bowl -->
      <div class="cc-gauge-foot">
        <span class="cc-core-sub">{{ usedGates }} of {{ activeGates }} gates boarding</span>
        <span class="cc-gauge-cap">{{ coverPct }}% in use</span>
      </div>
    </div>

    <!-- ── gate skyline ── -->
    <div class="cc-skyline-wrap">
      <div class="cc-rail"><span class="cc-shuttle" aria-hidden="true" /></div>
      <div class="cc-skyline">
        <button v-for="(g, i) in gates" :key="g.id" type="button" class="cc-pylon"
          :class="{ off: !g.is_active, hot: g.count > 0, lead: i === 0 && g.count > 0 }"
          :style="{ '--c': g.color, '--h': g.h + '%', '--d': (i * 0.06) + 's' }"
          :title="`${g.name} · ${g.count} tour${g.count === 1 ? '' : 's'}`"
          @click="$emit('pick', g.id)">
          <span class="cc-pylon-count">{{ g.count }}</span>
          <span class="cc-pylon-track">
            <span class="cc-pylon-bar">
              <span class="cc-pylon-cap" />
              <span v-if="g.count > 0" class="cc-board b1" />
              <span v-if="g.count > 0" class="cc-board b2" />
            </span>
            <span class="cc-pylon-tip">{{ g.name }} · {{ g.share }}%</span>
          </span>
          <span class="cc-pylon-foot">
            <component :is="g.iconComp" :size="13" />
            <span class="cc-pylon-code trv-mono">{{ g.short }}</span>
          </span>
        </button>

        <div v-if="!gates.length" class="cc-empty">
          <Compass :size="20" /> <span>No gates yet — open a category to start the concourse.</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Radio, Compass } from 'lucide-vue-next'
import TrvCountUp from './TrvCountUp.vue'
import { categoryIcon } from '@/composables/useTravel'
import { useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  categories: { type: Array, default: () => [] },
  max: { type: Number, default: 11 },   // skyline cap
})
defineEmits(['pick'])

const root = ref(null)
const { visible } = useInView(root, { threshold: 0.2 })

const SEMI = Math.PI * 88            // semicircle arc length ≈ 276.5
const totalTours = computed(() => props.categories.reduce((a, c) => a + (Number(c.request_count) || 0), 0))
const activeCats = computed(() => props.categories.filter(c => c.is_active))
const activeGates = computed(() => activeCats.value.length)
const usedGates = computed(() => props.categories.filter(c => (Number(c.request_count) || 0) > 0).length)

// Coverage = how much of the live taxonomy is actually being exercised.
const coverPct = computed(() => {
  const denom = activeGates.value || props.categories.length
  if (!denom) return 0
  return Math.round((usedGates.value / denom) * 100)
})
const arcOffset = ref(SEMI)
const drawArc = () => { arcOffset.value = SEMI * (1 - coverPct.value / 100) }

const gates = computed(() => {
  const max = Math.max(1, ...props.categories.map(c => Number(c.request_count) || 0))
  return [...props.categories]
    .sort((a, b) => (Number(b.request_count) || 0) - (Number(a.request_count) || 0) || a.name.localeCompare(b.name))
    .slice(0, props.max)
    .map(c => {
      const count = Number(c.request_count) || 0
      return {
        id: c.id, name: c.name, count,
        color: c.color_hex || '#fbbf24',
        is_active: c.is_active,
        iconComp: categoryIcon(c.icon),
        short: (c.code || c.name || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 5).toUpperCase() || '•••',
        share: totalTours.value ? Math.round((count / totalTours.value) * 100) : 0,
        // height: floor of 16% so empty gates still read as a skyline, scaled to the busiest.
        h: Math.round(16 + (count / max) * 80),
      }
    })
})

onMounted(() => { if (visible.value) requestAnimationFrame(drawArc) })
watch(visible, (v) => { if (v) requestAnimationFrame(drawArc) })
watch(coverPct, () => { if (visible.value) drawArc() })
</script>

<style scoped>
.cc-atlas {
  position: relative; overflow: hidden; isolation: isolate;
  display: grid; grid-template-columns: 230px 1fr; gap: 22px; align-items: center;
  margin-top: 18px; padding: 20px 22px; border-radius: 18px;
  background: linear-gradient(160deg, rgba(20,18,22,0.55), rgba(10,9,11,0.7));
  border: 1px solid var(--trv-border);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), var(--trv-card-shadow);
}
.cc-aura { position: absolute; inset: -50% 30% 30% -10%; pointer-events: none; z-index: 0;
  background: radial-gradient(60% 80% at 18% 10%, rgba(251,146,60,0.16), transparent 70%);
  animation: trv-aura-drift 12s ease-in-out infinite; }
.cc-floor { position: absolute; inset: auto -10% -2% -10%; height: 56%; z-index: 0; pointer-events: none; opacity: 0.5;
  background:
    repeating-linear-gradient(90deg, transparent 0 38px, rgba(251,191,36,0.06) 38px 39px),
    repeating-linear-gradient(0deg, transparent 0 22px, rgba(255,255,255,0.035) 22px 23px);
  transform: perspective(420px) rotateX(64deg); transform-origin: bottom center;
  -webkit-mask-image: linear-gradient(to top, #000, transparent); mask-image: linear-gradient(to top, #000, transparent); }

/* ── coverage gauge ── */
.cc-gauge { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 10px; padding-top: 6px; }
.cc-arc-wrap { position: relative; width: 200px; height: 116px; }
.cc-arc { width: 200px; height: 116px; overflow: visible; }
.cc-arc-track { fill: none; stroke: rgba(255,255,255,0.08); stroke-width: 11; stroke-linecap: round; }
.cc-arc-val { fill: none; stroke: url(#ccArcGrad); stroke-width: 11; stroke-linecap: round;
  stroke-dasharray: 276.5; transition: stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1);
  filter: drop-shadow(0 0 8px rgba(251,146,60,0.5)); }
.cc-ticks line { stroke: rgba(255,255,255,0.18); stroke-width: 1.4; stroke-linecap: round; }
.cc-gauge-core { position: absolute; top: 42px; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 3px; }
.cc-core-eyebrow { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trv-amber); }
.cc-core-val { font-size: 32px; font-weight: 850; line-height: 1; color: var(--trv-text); font-variant-numeric: tabular-nums; }
.cc-gauge-foot { display: flex; flex-direction: column; align-items: center; gap: 6px; margin-top: -12px; }
.cc-core-sub { font-size: 10.5px; color: var(--trv-text-muted); }
.cc-gauge-cap { font-size: 11px; font-weight: 750; color: var(--trv-amber-bright);
  padding: 2px 9px; border-radius: 999px; background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }

/* ── gate skyline ── */
.cc-skyline-wrap { position: relative; z-index: 1; }
.cc-rail { position: relative; height: 3px; margin-bottom: 8px; border-radius: 3px; overflow: hidden;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent); }
.cc-shuttle { position: absolute; top: 0; bottom: 0; width: 70px; border-radius: 3px;
  background: linear-gradient(90deg, transparent, var(--trv-amber-bright), transparent);
  box-shadow: 0 0 16px 2px rgba(251,191,36,0.55); animation: cc-shuttle 5.5s ease-in-out infinite; }
@keyframes cc-shuttle { 0% { left: -70px; } 50% { left: calc(100% + 0px); } 100% { left: -70px; } }

.cc-skyline { display: flex; align-items: stretch; gap: 9px; height: 152px; padding-top: 4px; }
.cc-pylon { position: relative; flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 5px;
  height: 100%; background: none; border: none; padding: 0; cursor: pointer;
  transition: transform 0.3s var(--trv-spring); }
.cc-pylon:hover { transform: translateY(-3px); z-index: 5; }
.cc-pylon-count { font-size: 11px; font-weight: 750; color: var(--trv-text-secondary); font-variant-numeric: tabular-nums;
  opacity: 0; transform: translateY(4px); transition: opacity 0.4s, transform 0.4s; transition-delay: var(--d); }
.cc-pylon.hot .cc-pylon-count { opacity: 1; transform: none; }
.cc-pylon-track { position: relative; flex: 1; width: 100%; min-height: 0; display: flex; align-items: flex-end; justify-content: center; }
.cc-pylon-bar { position: relative; width: 100%; max-width: 46px; border-radius: 8px 8px 3px 3px; overflow: hidden;
  height: var(--h, 16%); min-height: 12px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--c) 78%, transparent), color-mix(in srgb, var(--c) 22%, transparent));
  border: 1px solid color-mix(in srgb, var(--c) 40%, transparent); border-bottom: none;
  box-shadow: inset 0 0 18px -4px color-mix(in srgb, var(--c) 60%, transparent);
  transform-origin: bottom; animation: cc-rise 0.9s cubic-bezier(0.16,1,0.3,1) both; animation-delay: var(--d);
  transition: filter 0.3s; }
@keyframes cc-rise { 0% { transform: scaleY(0.04); opacity: 0.2; } 100% { transform: scaleY(1); opacity: 1; } }
.cc-pylon-cap { position: absolute; top: 0; left: 0; right: 0; height: 4px;
  background: color-mix(in srgb, var(--c) 95%, white); box-shadow: 0 0 12px 1px var(--c); }
.cc-pylon.off .cc-pylon-bar { background: repeating-linear-gradient(135deg, rgba(140,139,136,0.16) 0 6px, transparent 6px 12px);
  border-color: var(--trv-border-strong); box-shadow: none; filter: saturate(0.2); }
.cc-pylon.off .cc-pylon-cap { background: var(--trv-steel-dim); box-shadow: none; }
.cc-board { position: absolute; left: 50%; bottom: 6px; width: 5px; height: 5px; border-radius: 50%; margin-left: -2.5px;
  background: color-mix(in srgb, var(--c) 90%, white); box-shadow: 0 0 7px var(--c); }
.cc-board.b1 { animation: cc-board 2.6s ease-in infinite; animation-delay: var(--d); }
.cc-board.b2 { animation: cc-board 2.6s ease-in infinite; animation-delay: calc(var(--d) + 1.3s); }
@keyframes cc-board { 0% { bottom: 6px; opacity: 0; transform: scale(0.5); } 12% { opacity: 1; transform: scale(1); }
  100% { bottom: 92%; opacity: 0; transform: scale(0.6); } }
.cc-pylon-foot { display: flex; flex-direction: column; align-items: center; gap: 2px; color: var(--trv-text-dim);
  width: 100%; padding-top: 4px; border-top: 1px solid var(--trv-border); }
.cc-pylon-foot :deep(svg) { color: var(--c); opacity: 0.85; }
.cc-pylon.off .cc-pylon-foot :deep(svg) { color: var(--trv-text-dim); opacity: 0.6; }
.cc-pylon-code { font-size: 8.5px; letter-spacing: 0.04em; color: var(--trv-text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
.cc-pylon-tip { position: absolute; bottom: calc(var(--h) + 8px); left: 50%; transform: translate(-50%, 6px);
  white-space: nowrap; font-size: 10.5px; font-weight: 650; color: var(--trv-text); padding: 4px 9px; border-radius: 8px;
  background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow);
  opacity: 0; pointer-events: none; transition: opacity 0.2s, transform 0.2s; z-index: 4; }
.cc-pylon:hover .cc-pylon-bar { filter: brightness(1.18); }
.cc-pylon:hover .cc-pylon-tip { opacity: 1; transform: translate(-50%, 0); }
.cc-pylon.lead .cc-pylon-bar { box-shadow: inset 0 0 18px -4px color-mix(in srgb, var(--c) 60%, transparent), 0 0 22px -6px var(--c); }

.cc-empty { flex: 1; display: flex; align-items: center; justify-content: center; gap: 9px; height: 100%;
  color: var(--trv-text-dim); font-size: 12.5px; }
.cc-empty :deep(svg) { color: var(--trv-amber); opacity: 0.7; }

/* ── light theme ── */
[data-theme="light"] .cc-atlas { background: linear-gradient(160deg, rgba(255,251,243,0.82), rgba(255,247,234,0.7)); }
[data-theme="light"] .cc-floor {
  background:
    repeating-linear-gradient(90deg, transparent 0 38px, rgba(217,119,6,0.1) 38px 39px),
    repeating-linear-gradient(0deg, transparent 0 22px, rgba(120,90,30,0.07) 22px 23px); }
[data-theme="light"] .cc-arc-track { stroke: rgba(120,90,30,0.14); }
[data-theme="light"] .cc-ticks line { stroke: rgba(120,90,30,0.22); }
[data-theme="light"] .cc-rail { background: linear-gradient(90deg, transparent, rgba(120,90,30,0.18), transparent); }

@media (max-width: 760px) {
  .cc-atlas { grid-template-columns: 1fr; gap: 16px; }
  .cc-skyline { height: 128px; }
}
@media (prefers-reduced-motion: reduce) {
  .cc-aura, .cc-shuttle, .cc-board, .cc-pylon-bar { animation: none !important; }
  .cc-arc-val { transition: none; }
  .cc-pylon-count { opacity: 1; transform: none; }
}
</style>
