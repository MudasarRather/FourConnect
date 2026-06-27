<template>
  <Motion ref="root" as="section" class="atp hr-card"
    :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }">
    <span class="hr-grain" aria-hidden="true" />
    <header class="atp-head">
      <span class="atp-eyebrow"><Fingerprint :size="13" /> Attendance · Today</span>
      <button class="atp-link" type="button" @click="$emit('go', '/admin/hr/attendance/dashboard')">
        Open <ArrowUpRight :size="13" />
      </button>
    </header>

    <div class="atp-body">
      <!-- present-rate ring -->
      <button class="atp-gauge" type="button" @click="$emit('go', '/admin/hr/attendance/daily')">
        <svg viewBox="0 0 120 120" class="atp-ring">
          <defs>
            <linearGradient id="atpArc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="var(--hr-active)" />
              <stop offset="100%" stop-color="var(--hr-accent-gold)" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r="50" class="atp-track" />
          <circle cx="60" cy="60" r="50" class="atp-arc"
            :style="{ strokeDasharray: C, strokeDashoffset: lit ? arcOff : C }" />
        </svg>
        <span class="atp-center">
          <span class="atp-pct"><HrCountUp :value="presentRate" :start="lit" :duration="1.4" />%</span>
          <span class="atp-pct-lab">present</span>
          <span class="atp-pct-sub hr-mono">{{ present }}/{{ headcount }}</span>
        </span>
      </button>

      <div class="atp-side">
        <!-- composition bar -->
        <div class="atp-bar" role="img" aria-label="Attendance breakdown">
          <span v-for="s in bar" :key="s.key" class="atp-bar-seg"
            :style="{ width: (lit ? s.pct : 0) + '%', '--tone': s.color }" :title="`${s.label}: ${s.value}`" />
        </div>
        <ul class="atp-tiles">
          <Motion v-for="(t, i) in tiles" :key="t.key" as="li"
            :initial="reduced ? false : { opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.34, delay: 0.24 + i * 0.06 }">
            <button class="atp-tile" type="button" :style="{ '--tone': t.color }" @click="$emit('go', t.target)">
              <span class="atp-tile-ic"><component :is="t.icon" :size="14" /></span>
              <span class="atp-tile-val hr-mono"><HrCountUp :value="t.value" :start="lit" /></span>
              <span class="atp-tile-lab">{{ t.label }}</span>
            </button>
          </Motion>
        </ul>
      </div>
    </div>

    <button class="atp-foot" type="button" :data-warn="needsAction" @click="$emit('go', '/admin/hr/attendance/corrections')">
      <Clock :size="12" />
      <span v-if="needsAction">{{ late }} late · {{ corrections }} corrections pending</span>
      <span v-else>On-time {{ onTime }}% · roster clean</span>
      <ChevronRight :size="13" />
    </button>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Fingerprint, ArrowUpRight, UserCheck, UserX, Palmtree, House, Clock, ChevronRight } from 'lucide-vue-next'
import HrCountUp from '@/components/hr/HrCountUp.vue'
import { prefersReduced, useInView } from '@/composables/useShiftMotion'

const props = defineProps({ data: { type: Object, default: () => ({}) } })
defineEmits(['go'])
const reduced = prefersReduced()
const root = ref(null)
const { visible: lit } = useInView(root, { threshold: 0.3 })

const n = (v) => Number(v) || 0
const a = computed(() => props.data.attendance || {})
const headcount = computed(() => n(a.value.headcount) || n(props.data.core?.active_employees))
const present = computed(() => n(a.value.present_today))
const absent = computed(() => n(a.value.absent_today))
const onLeave = computed(() => n(a.value.on_leave))
const wfh = computed(() => n(a.value.on_wfh))
const late = computed(() => n(a.value.late_count))
const corrections = computed(() => n(a.value.pending_corrections) + n(a.value.pending_wfh))
const onTime = computed(() => Math.round(n(a.value.on_time_pct)))
const needsAction = computed(() => corrections.value > 0 || late.value > 0)

const presentRate = computed(() => headcount.value ? Math.round((present.value / headcount.value) * 100) : 0)
const C = 2 * Math.PI * 50
const arcOff = computed(() => C * (1 - Math.min(1, presentRate.value / 100)))

const bar = computed(() => {
  const denom = Math.max(1, present.value + absent.value + onLeave.value + wfh.value)
  return [
    { key: 'p', label: 'Present', value: present.value, color: 'var(--hr-active)' },
    { key: 'w', label: 'WFH', value: wfh.value, color: 'var(--hr-orange)' },
    { key: 'l', label: 'On leave', value: onLeave.value, color: 'var(--hr-accent-gold)' },
    { key: 'a', label: 'Absent', value: absent.value, color: 'var(--hr-suspended)' },
  ].map((s) => ({ ...s, pct: (s.value / denom) * 100 }))
})

const tiles = computed(() => [
  { key: 'present', icon: UserCheck, label: 'Present', value: present.value, color: 'var(--hr-active)', target: '/admin/hr/attendance/daily' },
  { key: 'absent', icon: UserX, label: 'Absent', value: absent.value, color: 'var(--hr-suspended)', target: '/admin/hr/attendance/daily' },
  { key: 'leave', icon: Palmtree, label: 'On Leave', value: onLeave.value, color: 'var(--hr-accent-gold)', target: '/admin/hr/leave/applications' },
  { key: 'wfh', icon: House, label: 'WFH', value: wfh.value, color: 'var(--hr-orange)', target: '/admin/hr/attendance/wfh' },
])
</script>

<style scoped>
.atp { position: relative; overflow: hidden; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
.atp-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.atp-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--hr-text-secondary); }
.atp-eyebrow :deep(svg) { color: var(--hr-accent-gold); }
.atp-link { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 700; color: var(--hr-text-muted); background: none; border: none; cursor: pointer; transition: color 0.2s; }
.atp-link:hover { color: var(--hr-accent-gold); }

.atp-body { display: grid; grid-template-columns: 132px 1fr; gap: 16px; align-items: center; flex: 1; }

.atp-gauge { position: relative; width: 132px; height: 132px; background: none; border: none; cursor: pointer; padding: 0; place-self: center; }
.atp-ring { width: 100%; height: 100%; transform: rotate(-90deg); }
.atp-track { fill: none; stroke: var(--hr-border); stroke-width: 9; }
.atp-arc { fill: none; stroke: url(#atpArc); stroke-width: 9; stroke-linecap: round; transition: stroke-dashoffset 1.3s var(--hr-spring); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--hr-active) 50%, transparent)); }
.atp-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; }
.atp-pct { font-size: 27px; font-weight: 850; color: var(--hr-text); letter-spacing: -0.02em; line-height: 1; }
.atp-pct-lab { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--hr-text-muted); }
.atp-pct-sub { font-size: 10px; color: var(--hr-text-dim); margin-top: 2px; }

.atp-side { display: flex; flex-direction: column; gap: 11px; }
.atp-bar { display: flex; gap: 3px; height: 9px; border-radius: 999px; overflow: hidden; background: var(--hr-input-bg); padding: 2px; }
.atp-bar-seg { height: 100%; border-radius: 999px; background: var(--tone); transition: width 0.9s var(--hr-spring); min-width: 0; }
.atp-tiles { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.atp-tile { display: grid; grid-template-columns: 24px auto; grid-template-rows: auto auto; column-gap: 8px; align-items: center; width: 100%; padding: 7px 9px; border-radius: 11px;
  background: var(--hr-input-bg); border: 1px solid var(--hr-border); cursor: pointer; font: inherit; text-align: left; transition: border-color 0.2s, transform 0.2s var(--hr-spring); }
.atp-tile:hover { border-color: color-mix(in srgb, var(--tone) 40%, transparent); transform: translateY(-2px); }
.atp-tile-ic { grid-row: 1 / 3; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 8px; color: var(--tone); background: color-mix(in srgb, var(--tone) 14%, transparent); }
.atp-tile-val { font-size: 16px; font-weight: 850; color: var(--hr-text); line-height: 1.1; }
.atp-tile-lab { font-size: 9.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--hr-text-muted); }

.atp-foot { display: inline-flex; align-items: center; gap: 7px; width: 100%; padding: 9px 12px; border-radius: 11px; font-size: 11.5px; font-weight: 600; cursor: pointer; font-family: inherit;
  color: var(--hr-active); background: var(--hr-active-soft); border: 1px solid color-mix(in srgb, var(--hr-active) 24%, transparent); transition: filter 0.2s; }
.atp-foot[data-warn="true"] { color: var(--hr-notice); background: var(--hr-notice-soft); border-color: color-mix(in srgb, var(--hr-notice) 28%, transparent); }
.atp-foot :last-child { margin-left: auto; }
.atp-foot:hover { filter: brightness(1.1); }

@media (prefers-reduced-motion: reduce) { .atp-arc, .atp-bar-seg { transition: none !important; } }
</style>
