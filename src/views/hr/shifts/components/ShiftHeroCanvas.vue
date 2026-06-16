<template>
  <Motion as="section" class="shift-hero" ref="heroRef"
    :initial="{ opacity: 0, y: -14, filter: 'blur(8px)' }" :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
    :transition="{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }">
    <!-- volumetric atmosphere (parallax depth layers) -->
    <span class="hero-aurora a1" aria-hidden="true" />
    <span class="hero-aurora a2" aria-hidden="true" />
    <span class="hero-glow" aria-hidden="true" />
    <span class="hero-mesh" aria-hidden="true" />
    <span class="hero-scan shift-scanline" aria-hidden="true" />
    <span class="hero-sheen" aria-hidden="true" />

    <div class="hero-left">
      <div class="hero-dial-wrap">
        <ShiftRadialDial :size="210" :arcs="arcs" center-sub="LIVE" />
        <span class="hero-dial-pulse shift-ring-pulse" aria-hidden="true" />
        <span class="hero-dial-halo" aria-hidden="true" />
      </div>
    </div>

    <div class="hero-mid">
      <span class="hero-eyebrow"><span class="hero-eyebrow-dot" />OPERATIONS · LIVE</span>
      <h1 class="hero-title">Control&nbsp;Tower</h1>
      <p class="hero-sub">{{ dateLabel }} · {{ arcs.length }} shift pattern{{ arcs.length === 1 ? '' : 's' }} on the dial</p>
      <div class="hero-onduty">
        <span class="od-label">On duty now</span>
        <span class="od-val"><ShiftCountUp :value="onDuty" /></span>
        <span class="od-of">of {{ k.employees_assigned }} assigned</span>
      </div>
    </div>

    <div class="hero-ticker">
      <Motion v-for="(t, i) in tiles" :key="t.key" as="button" class="ht" :data-tone="t.tone"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5, delay: 0.25 + i * 0.08, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ y: -3 }" :whileTap="{ scale: 0.96 }"
        @click="$emit('go', t.go)">
        <span class="ht-ic"><component :is="t.icon" :size="14" /></span>
        <span class="ht-meta">
          <b><ShiftCountUp :value="t.value" :suffix="t.suffix || ''" :decimals="t.decimals || 0" /></b>
          <small>{{ t.label }}</small>
        </span>
        <ArrowUpRight :size="13" class="ht-arr" />
      </Motion>
    </div>
  </Motion>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import { Moon, AlertTriangle, Timer, UserMinus, ArrowUpRight } from 'lucide-vue-next'
import ShiftRadialDial from './ShiftRadialDial.vue'
import ShiftCountUp from './ShiftCountUp.vue'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  stats: { type: Object, default: null },
  arcs: { type: Array, default: () => [] },
})
defineEmits(['go'])

const heroRef = ref(null)
usePointerSpotlight(heroRef)

const k = computed(() => props.stats?.kpis || {
  active_shifts: 0, employees_assigned: 0, night_shift_employees: 0,
  overtime_hours: 0, shift_conflicts: 0, unassigned_employees: 0,
})
const onDuty = computed(() => k.value.employees_assigned || 0)

const dateLabel = computed(() => new Date().toLocaleDateString(undefined, {
  weekday: 'long', month: 'short', day: 'numeric',
}))

const tiles = computed(() => [
  { key: 'night', icon: Moon, label: 'Night shift', value: k.value.night_shift_employees, tone: 'gold', go: 'night' },
  { key: 'ot', icon: Timer, label: 'OT hours (mo)', value: k.value.overtime_hours, decimals: 1, tone: 'gold', go: 'overtime-rules' },
  { key: 'unassigned', icon: UserMinus, label: 'Unassigned', value: k.value.unassigned_employees, tone: k.value.unassigned_employees > 0 ? 'warn' : 'ok', go: 'assignment' },
  { key: 'conflicts', icon: AlertTriangle, label: 'Conflicts', value: k.value.shift_conflicts, tone: k.value.shift_conflicts > 0 ? 'alert' : 'ok', go: 'coverage' },
])
</script>

<style scoped>
.shift-hero { position: relative; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 26px;
  padding: 24px 28px; border-radius: 24px; overflow: hidden; perspective: 1100px; will-change: transform, opacity, filter;
  background: linear-gradient(150deg, var(--shift-surface-2), var(--shift-surface));
  border: 1px solid var(--shift-border);
  box-shadow: 0 30px 80px -40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(253,230,138,0.06); }

/* ── parallax atmosphere ── */
.hero-glow { position: absolute; inset: 0; background: var(--shift-grad-hero); pointer-events: none;
  transform: translate3d(calc((var(--mx, 0.5) - 0.5) * 30px), calc((var(--my, 0.5) - 0.5) * 22px), 0); transition: transform 0.4s ease; }
.hero-aurora { position: absolute; border-radius: 50%; pointer-events: none; filter: blur(46px); opacity: 0.5; }
.hero-aurora.a1 { width: 360px; height: 360px; top: -150px; left: 8%;
  background: radial-gradient(circle, rgba(251,191,36,0.5), transparent 68%);
  animation: hero-drift-a 17s ease-in-out infinite;
  transform: translate3d(calc((var(--mx, 0.5) - 0.5) * -44px), calc((var(--my, 0.5) - 0.5) * -30px), 0); }
.hero-aurora.a2 { width: 320px; height: 320px; bottom: -160px; right: 12%;
  background: radial-gradient(circle, rgba(234,88,12,0.42), transparent 70%);
  animation: hero-drift-b 21s ease-in-out infinite;
  transform: translate3d(calc((var(--mx, 0.5) - 0.5) * 38px), calc((var(--my, 0.5) - 0.5) * 26px), 0); }
.hero-mesh { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(var(--shift-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--shift-grid-line) 1px, transparent 1px);
  background-size: 34px 34px; -webkit-mask: radial-gradient(120% 120% at 30% 0%, #000, transparent 70%);
  mask: radial-gradient(120% 120% at 30% 0%, #000, transparent 70%);
  transform: translate3d(calc((var(--mx, 0.5) - 0.5) * 14px), calc((var(--my, 0.5) - 0.5) * 10px), 0); transition: transform 0.5s ease; }
.hero-scan { position: absolute; left: 0; right: 0; top: 0; height: 40%;
  background: linear-gradient(180deg, transparent, rgba(251,191,36,0.05), transparent); pointer-events: none; }
.hero-sheen { position: absolute; inset: 0; pointer-events: none; opacity: 0;
  background: linear-gradient(110deg, transparent 42%, rgba(255,255,255,0.10) 50%, transparent 58%);
  background-size: 240% 100%; background-position: 130% 0; animation: hero-sheen 8s ease-in-out 1.2s infinite; }

.hero-left { position: relative; z-index: 1;
  transform: translate3d(calc((var(--mx, 0.5) - 0.5) * 16px), calc((var(--my, 0.5) - 0.5) * 12px), 0)
             rotateY(calc((var(--mx, 0.5) - 0.5) * 9deg)) rotateX(calc((var(--my, 0.5) - 0.5) * -7deg));
  transition: transform 0.35s ease; transform-style: preserve-3d; }
.hero-dial-wrap { position: relative; display: grid; place-items: center; }
.hero-dial-pulse { position: absolute; width: 90px; height: 90px; border-radius: 50%; }
.hero-dial-halo { position: absolute; width: 230px; height: 230px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--shift-amber) 18%, transparent), transparent 62%);
  animation: hero-halo 5s ease-in-out infinite; }

.hero-mid { position: relative; z-index: 1; min-width: 0;
  transform: translate3d(calc((var(--mx, 0.5) - 0.5) * 8px), 0, 0); transition: transform 0.4s ease; }
.hero-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 10px;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--shift-amber-strong); }
.hero-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--shift-ok); box-shadow: 0 0 0 0 var(--shift-ok); animation: shift-ring-pulse 2.4s ease-in-out infinite; }
.hero-title { margin: 6px 0 2px; font-size: 34px; font-weight: 900; letter-spacing: -0.03em; color: var(--shift-text);
  background: var(--shift-grad-cta); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.hero-sub { margin: 0; font-size: 12.5px; color: var(--shift-text-muted); font-family: var(--shift-mono); }
.hero-onduty { margin-top: 14px; display: flex; align-items: baseline; gap: 10px; }
.od-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-text-muted); }
.od-val { font-family: var(--shift-mono); font-size: 30px; font-weight: 900; color: var(--shift-text); }
.od-of { font-size: 12px; color: var(--shift-text-dim); }

.hero-ticker { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 9px; min-width: 280px; }
.ht { display: flex; align-items: center; gap: 9px; padding: 10px 12px; border-radius: 13px; cursor: pointer;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2);
  border-color: var(--shift-border-soft); text-align: left; overflow: hidden; position: relative; }
.ht::after { content: ''; position: absolute; inset: 0; border-radius: inherit; opacity: 0; transition: opacity 0.25s;
  background: linear-gradient(120deg, color-mix(in srgb, var(--shift-amber) 14%, transparent), transparent 60%); }
.ht:hover { border-color: var(--shift-border); }
.ht:hover::after { opacity: 1; }
.ht-ic { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; flex-shrink: 0; position: relative; z-index: 1;
  background: rgba(251,191,36,0.12); color: var(--shift-amber); }
.ht[data-tone="warn"] .ht-ic { background: var(--shift-warn-soft); color: var(--shift-ember-strong); }
.ht[data-tone="alert"] .ht-ic { background: var(--shift-alert-soft); color: var(--shift-alert); }
.ht[data-tone="ok"] .ht-ic { background: var(--shift-ok-soft); color: var(--shift-ok); }
.ht-meta { display: flex; flex-direction: column; min-width: 0; position: relative; z-index: 1; }
.ht-meta b { font-family: var(--shift-mono); font-size: 16px; color: var(--shift-text); line-height: 1.1; }
.ht-meta small { font-size: 10px; color: var(--shift-text-muted); white-space: nowrap; }
.ht-arr { margin-left: auto; opacity: 0.5; flex-shrink: 0; position: relative; z-index: 1; transition: transform 0.25s, opacity 0.2s; }
.ht:hover .ht-arr { opacity: 1; transform: translate(2px, -2px); }

@keyframes hero-drift-a { 0%, 100% { translate: 0 0; opacity: 0.45; } 50% { translate: 40px 30px; opacity: 0.7; } }
@keyframes hero-drift-b { 0%, 100% { translate: 0 0; opacity: 0.4; } 50% { translate: -36px -24px; opacity: 0.62; } }
@keyframes hero-halo { 0%, 100% { opacity: 0.5; transform: scale(0.94); } 50% { opacity: 0.85; transform: scale(1.06); } }
@keyframes hero-sheen { 0% { background-position: 130% 0; opacity: 0; } 12% { opacity: 1; } 28% { background-position: -40% 0; opacity: 0; } 100% { background-position: -40% 0; opacity: 0; } }

:root[data-theme="light"] .hero-aurora.a1 { opacity: 0.32; }
:root[data-theme="light"] .hero-aurora.a2 { opacity: 0.28; }
:root[data-theme="light"] .hero-sheen { background: linear-gradient(110deg, transparent 42%, rgba(255,255,255,0.5) 50%, transparent 58%); }

@media (prefers-reduced-motion: reduce) {
  .hero-aurora, .hero-dial-halo, .hero-sheen { animation: none !important; }
  .hero-glow, .hero-mesh, .hero-left, .hero-mid, .hero-aurora { transform: none !important; }
}

@media (max-width: 1080px) {
  .shift-hero { grid-template-columns: auto 1fr; }
  .hero-ticker { grid-column: 1 / -1; grid-template-columns: repeat(4, 1fr); min-width: 0; }
}
@media (max-width: 720px) {
  .shift-hero { grid-template-columns: 1fr; text-align: center; }
  .hero-left { justify-self: center; }
  .hero-eyebrow { justify-content: center; }
  .hero-onduty { justify-content: center; }
  .hero-ticker { grid-template-columns: 1fr 1fr; }
}
</style>
