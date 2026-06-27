<template>
  <!-- Self-service improvement-plan card. Employee mode → plan-title focus + acknowledge
       state; manager mode → report-name focus + an action hint. 3D tilt + spotlight glare,
       status spine, a vital-pulse mini sparkline, objectives-met ring + recovery window. -->
  <div class="spm-shell" :class="{ in: visible }" :style="{ '--i': index }">
    <article ref="cardEl" class="spm" :class="{ over: overdue, live: isOpen }" :style="{ '--c': meta.color }" @click="$emit('open', pip)">
      <span class="spm-glare" aria-hidden="true" />
      <span class="spm-sheen" aria-hidden="true" />
      <span class="spm-spine" />

      <header class="spm-head">
        <span class="spm-av">{{ initials }}</span>
        <div class="spm-id">
          <b>{{ mode === 'manager' ? pip.employee_name : pip.title }}</b>
          <span>{{ mode === 'manager' ? pip.title : (pip.designation_name || pip.department_name || 'Improvement plan') }}</span>
        </div>
        <span class="spm-stamp"><component :is="meta.icon" :size="11" />{{ meta.label }}</span>
      </header>

      <div class="spm-body">
        <div class="spm-ring" :style="{ '--perf-p': objDeg + 'deg' }">
          <span class="spm-ring-in"><b>{{ metCount }}</b><i>/{{ objCount }}</i></span>
        </div>
        <div class="spm-mid">
          <svg class="spm-spark" viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden="true">
            <path class="spm-spark-ghost" :d="sparkPath" />
            <path class="spm-spark-line" :d="sparkPath" />
          </svg>
          <div class="spm-meta">
            <span class="spm-time" :class="{ over: overdue }"><Clock :size="11" /> {{ timeLabel }}</span>
            <span class="spm-objs">{{ metCount }}/{{ objCount }} objectives met</span>
          </div>
        </div>
      </div>

      <footer class="spm-foot">
        <!-- employee: acknowledgement state -->
        <template v-if="mode === 'employee'">
          <span v-if="pip.employee_ack_at" class="spm-tag ok"><BadgeCheck :size="12" /> Acknowledged</span>
          <span v-else-if="isOpen" class="spm-tag warn"><BellRing :size="12" /> Acknowledge needed</span>
          <span v-else class="spm-tag muted"><Lock :size="12" /> Closed</span>
        </template>
        <!-- manager: next action hint -->
        <template v-else>
          <span class="spm-tag" :class="hint.cls"><component :is="hint.icon" :size="12" /> {{ hint.label }}</span>
        </template>
        <span class="spm-grow" />
        <span class="spm-open">{{ mode === 'manager' ? 'Run' : 'Open' }} <ArrowRight :size="12" /></span>
      </footer>
    </article>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Clock, ArrowRight, BadgeCheck, BellRing, Lock, Activity, CirclePlay, CheckCircle2, AlertTriangle } from 'lucide-vue-next'
import { pipStatusMeta } from '@/composables/usePerformance'
import { usePointerSpotlight, useInView, seededWave } from '@/composables/useShiftMotion'

const props = defineProps({
  pip: { type: Object, required: true },
  index: { type: Number, default: 0 },
  mode: { type: String, default: 'employee' },   // 'employee' | 'manager'
})
defineEmits(['open'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)
const { visible } = useInView(cardEl, { threshold: 0.18 })

const meta = computed(() => pipStatusMeta(props.pip.status))
const initials = computed(() => {
  const n = props.mode === 'manager' ? props.pip.employee_name : (props.pip.employee_name || props.pip.title)
  return (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
})
const objs = computed(() => props.pip.objectives || [])
const objCount = computed(() => objs.value.length)
const metCount = computed(() => objs.value.filter(o => o.status === 'MET').length)
const objDeg = computed(() => objCount.value ? Math.round(metCount.value / objCount.value * 360) : 0)
const isOpen = computed(() => ['ACTIVE', 'EXTENDED'].includes(props.pip.status))
const overdue = computed(() => isOpen.value && props.pip.end_date && new Date(props.pip.end_date) < new Date())
const timeLabel = computed(() => {
  const p = props.pip
  if (['SUCCESSFUL', 'UNSUCCESSFUL', 'CANCELLED'].includes(p.status)) return 'Closed'
  if (!p.end_date) return 'No deadline'
  const days = Math.round((new Date(p.end_date).getTime() - Date.now()) / 86400000)
  if (days < 0) return `${-days}d overdue`
  if (days === 0) return 'Due today'
  return `${days}d left`
})

const hint = computed(() => {
  const p = props.pip
  if (p.status === 'DRAFT') return { label: 'Set up & activate', cls: 'gold', icon: CirclePlay }
  if (overdue.value) return { label: 'Overdue — review', cls: 'warn', icon: AlertTriangle }
  if (isOpen.value) return { label: 'Log a check-in', cls: 'gold', icon: Activity }
  if (p.status === 'SUCCESSFUL') return { label: 'Recovered', cls: 'ok', icon: CheckCircle2 }
  return { label: meta.value.label, cls: 'muted', icon: meta.value.icon }
})

const RATING_VAL = { Improving: 0.95, 'On-track': 0.6, 'No change': 0.28 }
const sparkPath = computed(() => {
  const rated = (props.pip.check_ins || []).filter(c => c.rating).map(c => RATING_VAL[c.rating] ?? 0.5)
  let vals = rated
  if (vals.length < 2) {
    const seed = (props.pip.id || 'pip').split('').reduce((a, ch) => a + ch.charCodeAt(0), 0)
    vals = seededWave(seed, 9)
  }
  const n = vals.length, W = 120, H = 30, pad = 2
  return vals.map((v, i) => {
    const x = pad + (i / (n - 1)) * (W - pad * 2)
    const y = H - pad - v * (H - pad * 2)
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1)
  }).join(' ')
})
</script>

<style scoped>
.spm-shell { opacity: 0; transform: translateY(14px); }
.spm-shell.in { animation: spm-deal 0.55s var(--perf-spring) both; animation-delay: calc(min(var(--i, 0) * 0.05, 0.4) * 1s); }
@keyframes spm-deal { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
.spm { position: relative; overflow: hidden; cursor: pointer; display: flex; flex-direction: column; gap: 11px; padding: 14px 15px 12px 17px; border-radius: 16px;
  --mx: 0.5; --my: 0.5; --spot: 0;
  background: var(--perf-surface); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow);
  transition: transform 0.3s var(--perf-spring), border-color 0.25s, box-shadow 0.3s; --c: var(--perf-gold); }
.spm:hover { transform: perspective(1000px) rotateX(calc((var(--my, 0.5) - 0.5) * -4deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg)) translateY(-3px);
  border-color: var(--perf-border-warm); box-shadow: var(--perf-card-shadow-hover); }
.spm.over { border-color: color-mix(in srgb, var(--perf-conflict) 32%, transparent); }
.spm-glare { position: absolute; inset: 0; z-index: 2; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(380px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--c) 16%, transparent), transparent 42%); }
.spm-sheen { position: absolute; top: 0; left: 0; width: 55%; height: 100%; z-index: 2; pointer-events: none; opacity: 0;
  background: linear-gradient(105deg, transparent, color-mix(in srgb, #fff 18%, transparent), transparent); transform: translateX(-160%) skewX(-14deg); }
.spm:hover .spm-sheen { opacity: 1; animation: spm-sweep 0.9s var(--perf-ease); }
.spm-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--c); }
.spm.live .spm-spine::after { content: ''; position: absolute; inset: 0; background: inherit; filter: blur(4px); animation: spm-spinepulse 2.2s ease-in-out infinite; }

.spm-head { position: relative; display: flex; align-items: center; gap: 10px; }
.spm-av { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; font-size: 11px; font-weight: 850; color: #1a1206; background: var(--perf-grad-hero); }
.spm-id { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.spm-id b { font-size: 13px; font-weight: 800; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.spm-id span { font-size: 10.5px; color: var(--perf-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.spm-stamp { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 999px; flex-shrink: 0; font-size: 10px; font-weight: 800;
  color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }

.spm-body { display: flex; align-items: center; gap: 12px; }
.spm-ring { position: relative; width: 46px; height: 46px; flex-shrink: 0; border-radius: 50%;
  background: conic-gradient(var(--c) var(--perf-p, 0deg), var(--perf-track) 0deg); transition: --perf-p 0.9s var(--perf-spring); }
.spm-ring-in { position: absolute; inset: 4px; border-radius: 50%; background: var(--perf-surface); display: flex; align-items: baseline; justify-content: center; }
.spm-ring-in b { font-size: 14px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.spm-ring-in i { font-size: 9px; font-style: normal; color: var(--perf-text-muted); }
.spm-mid { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.spm-spark { width: 100%; height: 26px; }
.spm-spark-ghost { fill: none; stroke: color-mix(in srgb, var(--perf-text-muted) 24%, transparent); stroke-width: 1.4; }
.spm-spark-line { fill: none; stroke: var(--c); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 240; stroke-dashoffset: 240;
  animation: spm-draw 1.1s var(--perf-ease) 0.2s forwards; filter: drop-shadow(0 0 3px color-mix(in srgb, var(--c) 50%, transparent)); }
@keyframes spm-draw { to { stroke-dashoffset: 0; } }
@keyframes spm-sweep { from { transform: translateX(-160%) skewX(-14deg); } to { transform: translateX(260%) skewX(-14deg); } }
@keyframes spm-spinepulse { 0%, 100% { opacity: 0.25; } 50% { opacity: 0.9; } }
.spm-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.spm-time { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 750; color: var(--perf-text-secondary); }
.spm-time :deep(svg) { color: var(--perf-text-dim); }
.spm-time.over { color: var(--perf-conflict); }
.spm-time.over :deep(svg) { color: var(--perf-conflict); }
.spm-objs { font-size: 10px; color: var(--perf-text-muted); }

.spm-foot { display: flex; align-items: center; gap: 7px; padding-top: 10px; border-top: 1px solid var(--perf-border); }
.spm-tag { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 800; padding: 4px 9px; border-radius: 999px; }
.spm-tag.ok { color: var(--perf-ok); background: var(--perf-ok-soft); }
.spm-tag.warn { color: var(--perf-conflict); background: color-mix(in srgb, var(--perf-conflict) 12%, transparent); }
.spm-tag.gold { color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 13%, transparent); }
.spm-tag.muted { color: var(--perf-text-muted); background: var(--perf-surface-elevated); }
.spm-grow { flex: 1; }
.spm-open { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 750; color: var(--perf-text-secondary); }
.spm-open :deep(svg) { transition: transform 0.2s; }
.spm:hover .spm-open :deep(svg) { transform: translateX(3px); }

@media (prefers-reduced-motion: reduce) {
  .spm-shell { animation: none; opacity: 1; transform: none; } .spm:hover { transform: translateY(-2px); }
  .spm-sheen { display: none; } .spm.live .spm-spine::after { animation: none; }
  .spm-spark-line { animation: none; stroke-dashoffset: 0; } .spm-ring { transition: none; }
}
</style>
