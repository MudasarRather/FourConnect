<template>
  <Motion as="section" class="shift-hero"
    :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
    <span class="hero-glow" aria-hidden="true" />
    <span class="hero-scan shift-scanline" aria-hidden="true" />

    <div class="hero-left">
      <div class="hero-dial-wrap">
        <ShiftRadialDial :size="210" :arcs="arcs" center-sub="LIVE" />
        <span class="hero-dial-pulse shift-ring-pulse" aria-hidden="true" />
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
      <button v-for="t in tiles" :key="t.key" class="ht" :data-tone="t.tone" @click="$emit('go', t.go)">
        <span class="ht-ic"><component :is="t.icon" :size="14" /></span>
        <span class="ht-meta">
          <b><ShiftCountUp :value="t.value" :suffix="t.suffix || ''" :decimals="t.decimals || 0" /></b>
          <small>{{ t.label }}</small>
        </span>
        <ArrowUpRight :size="13" class="ht-arr" />
      </button>
    </div>
  </Motion>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Moon, AlertTriangle, Timer, UserMinus, ArrowUpRight } from 'lucide-vue-next'
import ShiftRadialDial from './ShiftRadialDial.vue'
import ShiftCountUp from './ShiftCountUp.vue'

const props = defineProps({
  stats: { type: Object, default: null },
  arcs: { type: Array, default: () => [] },
})
defineEmits(['go'])

const k = computed(() => props.stats?.kpis || {
  active_shifts: 0, employees_assigned: 0, night_shift_employees: 0,
  overtime_hours: 0, shift_conflicts: 0, unassigned_employees: 0,
})
const onDuty = computed(() => k.value.employees_assigned - k.value.night_shift_employees >= 0
  ? k.value.employees_assigned : k.value.employees_assigned)

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
  padding: 22px 26px; border-radius: 24px; overflow: hidden;
  background: var(--shift-surface); border: 1px solid var(--shift-border); }
.hero-glow { position: absolute; inset: 0; background: var(--shift-grad-hero); pointer-events: none; }
.hero-scan { position: absolute; left: 0; right: 0; top: 0; height: 40%;
  background: linear-gradient(180deg, transparent, rgba(251,191,36,0.05), transparent); pointer-events: none; }

.hero-left { position: relative; z-index: 1; }
.hero-dial-wrap { position: relative; display: grid; place-items: center; }
.hero-dial-pulse { position: absolute; width: 90px; height: 90px; border-radius: 50%; }

.hero-mid { position: relative; z-index: 1; min-width: 0; }
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
  transition: transform 0.2s var(--shift-ease), border-color 0.2s; text-align: left; }
.ht:hover { transform: translateY(-2px); border-color: var(--shift-border); }
.ht-ic { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; flex-shrink: 0;
  background: rgba(251,191,36,0.12); color: var(--shift-amber); }
.ht[data-tone="warn"] .ht-ic { background: var(--shift-warn-soft); color: var(--shift-ember-strong); }
.ht[data-tone="alert"] .ht-ic { background: var(--shift-alert-soft); color: var(--shift-alert); }
.ht[data-tone="ok"] .ht-ic { background: var(--shift-ok-soft); color: var(--shift-ok); }
.ht-meta { display: flex; flex-direction: column; min-width: 0; }
.ht-meta b { font-family: var(--shift-mono); font-size: 16px; color: var(--shift-text); line-height: 1.1; }
.ht-meta small { font-size: 10px; color: var(--shift-text-muted); white-space: nowrap; }
.ht-arr { margin-left: auto; opacity: 0.5; flex-shrink: 0; }
.ht:hover .ht-arr { opacity: 1; }

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
