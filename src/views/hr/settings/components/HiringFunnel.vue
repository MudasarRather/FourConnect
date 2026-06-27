<template>
  <div ref="rootEl" class="hf" :class="{ ready }">
    <!-- ambient field -->
    <span class="hf-grain" aria-hidden="true" />
    <span class="hf-aura" aria-hidden="true" />
    <svg class="hf-field" viewBox="0 0 600 460" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient :id="`hfFlow-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--set-gold)" stop-opacity="0.5" />
          <stop offset="100%" stop-color="var(--set-deep)" stop-opacity="0.05" />
        </linearGradient>
      </defs>
      <path v-for="(d, i) in fieldLines" :key="i" :d="d" fill="none"
        :stroke="`url(#hfFlow-${uid})`" stroke-width="1" class="hf-fl" :style="{ '--d': i }" />
    </svg>

    <!-- cascading talent motes (data-independent → never reads empty) -->
    <div class="hf-motes" aria-hidden="true">
      <span v-for="p in motes" :key="p.id" class="hf-mote"
        :style="{ '--x': p.x + '%', '--dur': p.dur + 's', '--delay': p.delay + 's', '--sz': p.sz + 'px', '--drift': p.drift + 'px' }" />
    </div>

    <!-- floating telemetry HUD -->
    <div class="hf-hud">
      <span class="hf-hud-live"><i /> Live pipeline</span>
      <div class="hf-hud-grid">
        <div class="hf-hud-cell">
          <b><SetCountUp :value="inFunnel" /></b>
          <span>In funnel</span>
        </div>
        <div class="hf-hud-cell">
          <b class="ok"><SetCountUp :value="joined" /></b>
          <span>Joined</span>
        </div>
        <div class="hf-hud-cell">
          <b><SetCountUp :value="conversion" :decimals="1" suffix="%" /></b>
          <span>Conversion</span>
        </div>
      </div>
    </div>

    <!-- the cascade -->
    <div class="hf-stack">
      <div v-for="(s, i) in rows" :key="s.key" class="hf-gate" :style="gateStyle(s, i)">
        <span class="hf-gate-sheen" aria-hidden="true" />
        <span class="hf-gate-ic"><component :is="s.icon" :size="15" /></span>
        <span class="hf-gate-lab">{{ s.label }}</span>
        <span class="hf-gate-meter"><i :style="{ width: ready ? s.share + '%' : '0%' }" /></span>
        <span class="hf-gate-val"><SetCountUp :value="s.count" /></span>
        <span v-if="i < rows.length - 1" class="hf-neck" aria-hidden="true" />
      </div>

      <!-- hired basin -->
      <div class="hf-basin" :class="{ filled: joined > 0 }">
        <span class="hf-basin-glow" aria-hidden="true" />
        <span class="hf-basin-ring r1" aria-hidden="true" />
        <span class="hf-basin-ring r2" aria-hidden="true" />
        <Award :size="18" class="hf-basin-ic" />
        <div class="hf-basin-txt"><b><SetCountUp :value="joined" /></b><span>Hired</span></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Award } from 'lucide-vue-next'
import SetCountUp from './SetCountUp.vue'
import { usePointerSpotlight, prefersReduced, useInView, seededWave } from '@/composables/useShiftMotion'
import { toneColor } from '../composables/recruitmentVocab'

const props = defineProps({
  // [{ key, label, tone, icon, count }] — top→bottom funnel order
  stages: { type: Array, default: () => [] },
})

const rootEl = ref(null)
const uid = Math.round(seededWave(7, 1)[0] * 1e6).toString(36)
usePointerSpotlight(rootEl)
const { visible } = useInView(rootEl, { threshold: 0.2 })
const ready = ref(false)
onMounted(() => { requestAnimationFrame(() => { ready.value = true }) })

const rows = computed(() => {
  const max = Math.max(1, ...props.stages.map(s => s.count || 0))
  return props.stages.map(s => ({
    ...s,
    color: toneColor(s.tone),
    share: Math.round(((s.count || 0) / max) * 100),
  }))
})

const inFunnel = computed(() =>
  props.stages.filter(s => s.key !== 'JOINED').reduce((n, s) => n + (s.count || 0), 0))
const joined = computed(() => props.stages.find(s => s.key === 'JOINED')?.count || 0)
const applied = computed(() => props.stages.find(s => s.key === 'APPLIED')?.count || 0)
const conversion = computed(() => applied.value ? (joined.value / applied.value) * 100 : 0)

const gateStyle = (s, i) => ({
  '--acc': s.color,
  '--w': (100 - i * 7.5) + '%',
  '--i': i,
})

// deterministic cascading motes — independent of data so the funnel is alive
// even on an empty DB.
const motes = computed(() => {
  if (prefersReduced()) return []
  const w = seededWave(31, 30)
  return Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: 16 + w[i] * 68,
    dur: 3.4 + w[(i + 5) % 30] * 3.6,
    delay: -w[(i + 11) % 30] * 7,
    sz: 2 + Math.round(w[(i + 3) % 30] * 3),
    drift: (w[(i + 7) % 30] - 0.5) * 40,
  }))
})

// faint flow-field strokes (topographic feel) — deterministic
const fieldLines = computed(() => {
  const out = []
  for (let i = 0; i < 7; i++) {
    const y = 40 + i * 62
    out.push(`M-20 ${y} C 150 ${y - 38}, 300 ${y + 34}, 620 ${y - 20}`)
  }
  return out
})
</script>

<style scoped>
.hf {
  position: relative; overflow: hidden;
  border-radius: 20px; padding: 22px 20px 26px;
  min-height: 420px;
  background:
    radial-gradient(120% 90% at 78% 6%, color-mix(in srgb, var(--set-gold) 12%, transparent), transparent 60%),
    var(--set-panel);
  border: 1px solid var(--set-border);
  display: flex; flex-direction: column;
  --mx: 0.5; --my: 0.5;
}
.hf-grain { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.6;
  background-image:
    linear-gradient(color-mix(in srgb, var(--set-gold) 5%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--set-gold) 5%, transparent) 1px, transparent 1px);
  background-size: 34px 34px;
  mask-image: radial-gradient(130% 120% at 50% 0%, #000 8%, transparent 70%);
  -webkit-mask-image: radial-gradient(130% 120% at 50% 0%, #000 8%, transparent 70%); }
.hf-aura { position: absolute; inset: -40% -10% auto -10%; height: 80%; z-index: 0; pointer-events: none;
  background: radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--set-gold) 22%, transparent), transparent 66%);
  filter: blur(34px);
  transform: translate(calc((var(--mx) - 0.5) * -22px), calc((var(--my) - 0.5) * -14px)); }
.hf-field { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; opacity: 0.5;
  transform: translate(calc((var(--mx) - 0.5) * 18px), calc((var(--my) - 0.5) * 12px)); }
.hf-fl { stroke-dasharray: 6 10; animation: hf-flow 7s linear infinite; animation-delay: calc(var(--d) * -0.7s); }
@keyframes hf-flow { to { stroke-dashoffset: -160; } }

/* cascading motes */
.hf-motes { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  transform: translateX(calc((var(--mx) - 0.5) * 14px)); }
.hf-mote { position: absolute; top: -4%; left: var(--x); width: var(--sz); height: var(--sz); border-radius: 50%;
  background: var(--set-gold-bright); box-shadow: 0 0 8px color-mix(in srgb, var(--set-gold) 70%, transparent);
  opacity: 0; animation: hf-fall var(--dur) linear infinite; animation-delay: var(--delay); }
@keyframes hf-fall {
  0% { transform: translate(0, 0); opacity: 0; }
  12% { opacity: 0.85; }
  82% { opacity: 0.7; }
  100% { transform: translate(var(--drift), 440px); opacity: 0; }
}

/* HUD */
.hf-hud { position: absolute; top: 16px; right: 16px; z-index: 3;
  padding: 11px 13px; border-radius: 14px; min-width: 188px;
  background: var(--set-surface-glass); border: 1px solid var(--set-border-strong);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 20px 44px -28px rgba(0,0,0,0.7); }
.hf-hud-live { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--set-text-muted); }
.hf-hud-live i { width: 6px; height: 6px; border-radius: 50%; background: var(--set-ok);
  box-shadow: 0 0 9px var(--set-ok); animation: hf-blink 2.4s ease-in-out infinite; }
@keyframes hf-blink { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
.hf-hud-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
.hf-hud-cell { display: flex; flex-direction: column; gap: 1px; }
.hf-hud-cell b { font-size: 17px; font-weight: 850; color: var(--set-text); font-variant-numeric: tabular-nums; line-height: 1; }
.hf-hud-cell b.ok { color: var(--set-ok); }
.hf-hud-cell span { font-size: 9px; font-weight: 600; color: var(--set-text-dim); text-transform: uppercase; letter-spacing: 0.05em; }

/* the cascade stack */
.hf-stack { position: relative; z-index: 2; margin-top: auto; display: flex; flex-direction: column; align-items: center; gap: 0; padding-top: 12px; }
.hf-gate { position: relative; width: var(--w); max-width: 460px;
  display: flex; align-items: center; gap: 11px;
  padding: 11px 15px; border-radius: 13px; margin-bottom: 11px;
  background: linear-gradient(100deg, color-mix(in srgb, var(--acc) 16%, var(--set-surface)), var(--set-surface) 72%);
  border: 1px solid color-mix(in srgb, var(--acc) 30%, transparent);
  box-shadow: 0 14px 30px -22px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.02);
  opacity: 0; transform: translateY(16px) scale(0.97);
  transition: opacity 0.55s var(--set-spring), transform 0.55s var(--set-spring), border-color 0.3s; }
.ready .hf-gate { opacity: 1; transform: none; transition-delay: calc(var(--i) * 0.07s); }
.hf-gate:hover { border-color: color-mix(in srgb, var(--acc) 55%, transparent); }
.hf-gate-sheen { position: absolute; inset: 0; border-radius: 13px; pointer-events: none; overflow: hidden;
  background: linear-gradient(105deg, transparent 30%, color-mix(in srgb, var(--acc) 26%, transparent) 50%, transparent 70%);
  background-size: 240% 100%; animation: hf-sheen 5.5s linear infinite; animation-delay: calc(var(--i) * -0.6s); opacity: 0.55; }
@keyframes hf-sheen { 0% { background-position: 220% 0; } 100% { background-position: -120% 0; } }
.hf-gate-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
  color: var(--acc); background: color-mix(in srgb, var(--acc) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--acc) 30%, transparent); }
.hf-gate-lab { font-size: 12.5px; font-weight: 750; color: var(--set-text); white-space: nowrap; }
.hf-gate-meter { flex: 1; height: 5px; border-radius: 999px; background: color-mix(in srgb, var(--acc) 12%, transparent); overflow: hidden; min-width: 24px; }
.hf-gate-meter i { display: block; height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--acc) 60%, transparent), var(--acc));
  transition: width 0.9s var(--set-spring) calc(0.2s + var(--i) * 0.07s);
  box-shadow: 0 0 10px color-mix(in srgb, var(--acc) 60%, transparent); }
.hf-gate-val { font-size: 15px; font-weight: 850; color: var(--set-text); font-variant-numeric: tabular-nums; flex-shrink: 0; min-width: 20px; text-align: right; }
.hf-neck { position: absolute; left: 50%; bottom: -11px; width: 2px; height: 11px; transform: translateX(-50%);
  background: linear-gradient(180deg, color-mix(in srgb, var(--acc) 55%, transparent), transparent); }

/* hired basin */
.hf-basin { position: relative; margin-top: 4px; display: flex; align-items: center; gap: 11px;
  padding: 12px 22px; border-radius: 999px; overflow: hidden;
  background: linear-gradient(100deg, color-mix(in srgb, var(--set-ok) 18%, var(--set-surface)), var(--set-surface) 74%);
  border: 1px solid color-mix(in srgb, var(--set-ok) 36%, transparent); }
.hf-basin-glow { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(60% 120% at 50% 120%, color-mix(in srgb, var(--set-ok) 30%, transparent), transparent 70%); }
.hf-basin-ring { position: absolute; left: 50%; bottom: -4px; width: 40px; height: 40px; transform: translateX(-50%);
  border-radius: 50%; border: 1px solid color-mix(in srgb, var(--set-ok) 45%, transparent); opacity: 0; }
.hf-basin.filled .hf-basin-ring.r1 { animation: hf-emit 3s ease-out infinite; }
.hf-basin.filled .hf-basin-ring.r2 { animation: hf-emit 3s ease-out infinite 1.5s; }
@keyframes hf-emit { 0% { opacity: 0.6; transform: translateX(-50%) scale(0.4); } 100% { opacity: 0; transform: translateX(-50%) scale(2.4); } }
.hf-basin-ic { position: relative; color: var(--set-ok); }
.hf-basin-txt { position: relative; display: flex; flex-direction: column; gap: 0; line-height: 1; }
.hf-basin-txt b { font-size: 17px; font-weight: 850; color: var(--set-ok); font-variant-numeric: tabular-nums; }
.hf-basin-txt span { font-size: 9.5px; font-weight: 700; color: var(--set-text-muted); text-transform: uppercase; letter-spacing: 0.08em; }

@media (max-width: 640px) {
  .hf-hud { position: static; margin: 0 0 16px auto; }
  .hf-stack { margin-top: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .hf-fl, .hf-gate-sheen, .hf-hud-live i, .hf-basin-ring { animation: none !important; }
  .hf-gate { opacity: 1; transform: none; transition: none; }
  .hf-gate-meter i { transition: none; }
}
</style>
