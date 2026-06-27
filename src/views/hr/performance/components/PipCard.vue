<template>
  <!-- Cinematic PIP card — status spine, 3D pointer-tilt + spotlight glare, a per-plan
       vital sparkline (ECG of check-in sentiment), objectives-recovered meter, recovery
       window bar, and the auto-spawn provenance chip (cross-links to the source review). -->
  <div class="pc-shell" :style="{ '--i': index }">
    <article ref="cardEl" class="pc" :class="{ over: overdue }" :style="{ '--c': meta.color }" @click="$emit('open', pip)">
      <span class="pc-glare" aria-hidden="true" />
      <span class="pc-spine" />

      <header class="pc-head">
        <span class="pc-av">{{ initials }}</span>
        <div class="pc-id">
          <b>{{ pip.employee_name }}</b>
          <span>{{ pip.designation_name || pip.employee_code || '—' }}{{ pip.department_name ? ' · ' + pip.department_name : '' }}</span>
        </div>
        <span class="pc-stamp"><component :is="meta.icon" :size="11" />{{ meta.label }}</span>
      </header>

      <p class="pc-title">{{ pip.title }}</p>

      <!-- vital sparkline -->
      <div class="pc-vital">
        <svg class="pc-spark" viewBox="0 0 120 34" preserveAspectRatio="none" aria-hidden="true">
          <path class="pc-spark-ghost" :d="sparkPath" />
          <path class="pc-spark-line" :d="sparkPath" />
        </svg>
        <span class="pc-vital-tag" :class="sentimentClass"><component :is="HeartPulse" :size="11" /> {{ sentimentLabel }}</span>
      </div>

      <!-- meters -->
      <div class="pc-meters">
        <div class="pc-meter">
          <span class="pc-meter-lab"><Target :size="11" /> {{ metCount }}/{{ objCount }} objectives met</span>
          <div class="pc-meter-track"><i :style="{ width: (mounted ? objPct : 0) + '%' }" /></div>
        </div>
        <div v-if="elapsed !== null" class="pc-meter">
          <span class="pc-meter-lab"><Clock :size="11" /> {{ timeLabel }}</span>
          <div class="pc-meter-track"><i class="time" :class="{ over: elapsed > 100 }" :style="{ width: (mounted ? Math.min(100, elapsed) : 0) + '%' }" /></div>
        </div>
      </div>

      <footer class="pc-foot">
        <button v-if="pip.review_id" class="pc-chip linked" type="button" title="Spawned from a performance review — open it"
          @click.stop="$emit('go-review', pip)"><GitBranch :size="11" /> From review</button>
        <span v-if="pip.manager_name" class="pc-chip"><UserRound :size="11" /> {{ firstName(pip.manager_name) }}</span>
        <span class="pc-grow" />
        <span class="pc-open">Manage <ArrowRight :size="12" /></span>
      </footer>
    </article>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Target, Clock, GitBranch, UserRound, ArrowRight, HeartPulse } from 'lucide-vue-next'
import { pipStatusMeta } from '@/composables/usePerformance'
import { usePointerSpotlight, seededWave } from '@/composables/useShiftMotion'

const props = defineProps({
  pip: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
defineEmits(['open', 'go-review'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)
const mounted = ref(false)
onMounted(() => requestAnimationFrame(() => { mounted.value = true }))

const initials = computed(() => (props.pip.employee_name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?')
const firstName = (n) => (n || '').trim().split(/\s+/)[0] || n
const meta = computed(() => pipStatusMeta(props.pip.status))
const objs = computed(() => props.pip.objectives || [])
const objCount = computed(() => objs.value.length)
const metCount = computed(() => objs.value.filter(o => o.status === 'MET').length)
const objPct = computed(() => objCount.value ? Math.round(metCount.value / objCount.value * 100) : 0)

const elapsed = computed(() => {
  const p = props.pip
  if (!p.start_date || !p.end_date) return null
  const s = new Date(p.start_date).getTime(), e = new Date(p.end_date).getTime(), n = Date.now()
  if (e <= s) return null
  return Math.round((n - s) / (e - s) * 100)
})
const overdue = computed(() => ['ACTIVE', 'EXTENDED'].includes(props.pip.status) && props.pip.end_date && new Date(props.pip.end_date) < new Date())
const timeLabel = computed(() => {
  const p = props.pip
  if (['SUCCESSFUL', 'UNSUCCESSFUL', 'CANCELLED'].includes(p.status)) return 'Closed'
  if (!p.end_date) return 'No deadline'
  const days = Math.round((new Date(p.end_date).getTime() - Date.now()) / 86400000)
  if (days < 0) return `${-days}d overdue`
  if (days === 0) return 'Due today'
  return `${days}d left`
})

// sentiment from latest check-in rating
const RATING_VAL = { Improving: 0.95, 'On-track': 0.62, 'No change': 0.28 }
const checkIns = computed(() => [...(props.pip.check_ins || [])])
const sentiment = computed(() => {
  const rated = checkIns.value.filter(c => c.rating)
  if (!rated.length) return null
  return rated[rated.length - 1].rating
})
const sentimentLabel = computed(() => sentiment.value || (checkIns.value.length ? 'Logged' : 'No check-ins'))
const sentimentClass = computed(() => {
  const s = sentiment.value
  if (s === 'Improving') return 'good'
  if (s === 'On-track') return 'mid'
  if (s === 'No change') return 'low'
  return 'idle'
})

// build a mini ECG/recovery sparkline from check-in ratings, seeded fallback
const sparkPath = computed(() => {
  const rated = checkIns.value.filter(c => c.rating).map(c => RATING_VAL[c.rating] ?? 0.5)
  let vals = rated
  if (vals.length < 2) {
    const seed = (props.pip.id || 'pip').split('').reduce((a, ch) => a + ch.charCodeAt(0), 0)
    vals = seededWave(seed, 9)
  }
  const n = vals.length
  const W = 120, H = 34, pad = 2
  return vals.map((v, i) => {
    const x = pad + (i / (n - 1)) * (W - pad * 2)
    const y = H - pad - v * (H - pad * 2)
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1)
  }).join(' ')
})
</script>

<style scoped>
.pc-shell { animation: pc-deal 0.5s var(--perf-spring) both; animation-delay: calc(min(var(--i, 0) * 0.045, 0.4) * 1s); }
@keyframes pc-deal { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
.pc { position: relative; overflow: hidden; cursor: pointer; display: flex; flex-direction: column; gap: 11px; padding: 15px 16px 13px 18px; border-radius: 17px;
  background: var(--perf-surface); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow);
  transition: transform 0.3s var(--perf-spring), border-color 0.25s, box-shadow 0.3s; --c: var(--perf-gold); }
.pc:hover { transform: perspective(1100px) rotateX(calc((var(--my, 0.5) - 0.5) * -4deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 6deg)) translateY(-3px);
  border-color: var(--perf-border-warm); box-shadow: var(--perf-card-shadow-hover); }
.pc.over { border-color: color-mix(in srgb, var(--perf-conflict) 32%, transparent); }
.pc-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(420px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--c) 16%, transparent), transparent 42%); }
.pc-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--c); }

.pc-head { position: relative; display: flex; align-items: center; gap: 10px; }
.pc-av { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; font-size: 11px; font-weight: 850; color: #1a1206; background: var(--perf-grad-hero); }
.pc-id { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.pc-id b { font-size: 13px; font-weight: 800; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pc-id span { font-size: 10.5px; color: var(--perf-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pc-stamp { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 999px; flex-shrink: 0; font-size: 10px; font-weight: 800;
  color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.pc-title { margin: 0; font-size: 13px; font-weight: 650; color: var(--perf-text-secondary); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.pc-vital { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 11px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.pc-spark { flex: 1; height: 30px; min-width: 0; }
.pc-spark-ghost { fill: none; stroke: color-mix(in srgb, var(--perf-text-muted) 24%, transparent); stroke-width: 1.4; }
.pc-spark-line { fill: none; stroke: var(--c); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 240; stroke-dashoffset: 240; animation: pc-draw 1.1s var(--perf-ease) 0.2s forwards; filter: drop-shadow(0 0 3px color-mix(in srgb, var(--c) 50%, transparent)); }
@keyframes pc-draw { to { stroke-dashoffset: 0; } }
.pc-vital-tag { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 999px; }
.pc-vital-tag.good { color: var(--perf-ok); background: var(--perf-ok-soft); }
.pc-vital-tag.mid { color: var(--perf-amber); background: color-mix(in srgb, var(--perf-amber) 13%, transparent); }
.pc-vital-tag.low { color: var(--perf-conflict); background: color-mix(in srgb, var(--perf-conflict) 12%, transparent); }
.pc-vital-tag.idle { color: var(--perf-text-muted); background: var(--perf-surface-elevated); }

.pc-meters { display: flex; flex-direction: column; gap: 8px; }
.pc-meter { display: flex; flex-direction: column; gap: 4px; }
.pc-meter-lab { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: var(--perf-text-muted); }
.pc-meter-lab :deep(svg) { color: var(--c); }
.pc-meter-track { height: 5px; border-radius: 999px; background: var(--perf-track); overflow: hidden; }
.pc-meter-track i { display: block; height: 100%; border-radius: 999px; background: var(--c); transition: width 0.9s var(--perf-spring); }
.pc-meter-track i.time { background: color-mix(in srgb, var(--perf-text-muted) 60%, var(--c)); }
.pc-meter-track i.time.over { background: var(--perf-conflict); }

.pc-foot { display: flex; align-items: center; gap: 7px; padding-top: 10px; border-top: 1px solid var(--perf-border); }
.pc-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; padding: 4px 9px; border-radius: 999px; color: var(--perf-text-muted); background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); }
.pc-chip :deep(svg) { color: var(--perf-text-dim); }
.pc-chip.linked { cursor: pointer; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 9%, transparent); border-color: color-mix(in srgb, var(--perf-gold) 28%, transparent); transition: all 0.18s; }
.pc-chip.linked :deep(svg) { color: var(--perf-gold); }
.pc-chip.linked:hover { background: color-mix(in srgb, var(--perf-gold) 16%, transparent); transform: translateY(-1px); }
.pc-grow { flex: 1; }
.pc-open { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 750; color: var(--perf-text-secondary); }
.pc-open :deep(svg) { transition: transform 0.2s; }
.pc:hover .pc-open :deep(svg) { transform: translateX(3px); }

@media (prefers-reduced-motion: reduce) {
  .pc-shell { animation: none; }
  .pc:hover { transform: none; }
  .pc-spark-line { animation: none; stroke-dashoffset: 0; }
  .pc-meter-track i { transition: none; }
}
</style>
