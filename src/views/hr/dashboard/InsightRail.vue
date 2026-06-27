<template>
  <div ref="root" class="isr">
    <!-- ── Hiring funnel ── -->
    <Motion as="section" class="isr-card hr-card"
      :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.06, ease: [0.16, 1, 0.3, 1] }">
      <span class="hr-grain" aria-hidden="true" />
      <header class="isr-head">
        <span class="isr-eyebrow"><Filter :size="12" /> Hiring Funnel</span>
        <button class="isr-link" type="button" @click="$emit('go', '/admin/hr/recruitment/pipeline')"><ArrowUpRight :size="13" /></button>
      </header>
      <div class="isr-hero"><HrCountUp :value="openRoles" :start="lit" /><small>open roles</small></div>
      <div v-if="funnel.length" class="isr-funnel">
        <div v-for="(s, i) in funnel" :key="i" class="isr-fn-row">
          <span class="isr-fn-lab">{{ s.stage }}</span>
          <span class="isr-fn-track"><span class="isr-fn-fill" :style="{ width: (lit ? s.pct : 0) + '%', transitionDelay: (i * 0.08) + 's' }" /></span>
          <span class="isr-fn-val hr-mono">{{ s.count }}</span>
        </div>
      </div>
      <p v-else class="isr-blank">No active pipeline.</p>
    </Motion>

    <!-- ── Payroll cost trend ── -->
    <Motion as="section" class="isr-card hr-card"
      :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.13, ease: [0.16, 1, 0.3, 1] }">
      <span class="hr-grain" aria-hidden="true" />
      <header class="isr-head">
        <span class="isr-eyebrow"><Banknote :size="12" /> Payroll Cost</span>
        <button class="isr-link" type="button" @click="$emit('go', '/admin/hr/payroll/dashboard')"><ArrowUpRight :size="13" /></button>
      </header>
      <div class="isr-hero">{{ money(currentNet) }}<small>{{ periodLabel }} net</small></div>
      <div v-if="costTrend.length" class="isr-bars">
        <div v-for="(b, i) in costTrend" :key="i" class="isr-bar-col" :title="`${b.label}: ${money(b.value)}`">
          <span class="isr-bar" :class="{ on: i === costTrend.length - 1 }" :style="{ height: (lit ? b.h : 0) + '%', transitionDelay: (i * 0.06) + 's' }" />
          <span class="isr-bar-lab">{{ b.short }}</span>
        </div>
      </div>
      <p v-else class="isr-blank">Run a payroll batch to see trends.</p>
    </Motion>

    <!-- ── Exits & attrition ── -->
    <Motion as="section" class="isr-card hr-card"
      :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }">
      <span class="hr-grain" aria-hidden="true" />
      <header class="isr-head">
        <span class="isr-eyebrow"><DoorOpen :size="12" /> Exits &amp; Attrition</span>
        <button class="isr-link" type="button" @click="$emit('go', '/admin/hr/exit/dashboard')"><ArrowUpRight :size="13" /></button>
      </header>
      <div class="isr-hero exit"><HrCountUp :value="servingNotice" :start="lit" /><small>serving notice</small></div>
      <ul class="isr-mini">
        <li v-for="m in exitMini" :key="m.key" :style="{ '--tone': m.color }">
          <span class="isr-mini-dot" />
          <span class="isr-mini-lab">{{ m.label }}</span>
          <span class="isr-mini-val hr-mono"><HrCountUp :value="m.value" :start="lit" /></span>
        </li>
      </ul>
    </Motion>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Filter, Banknote, DoorOpen, ArrowUpRight } from 'lucide-vue-next'
import HrCountUp from '@/components/hr/HrCountUp.vue'
import { prefersReduced, useInView } from '@/composables/useShiftMotion'

const props = defineProps({ data: { type: Object, default: () => ({}) } })
defineEmits(['go'])
const reduced = prefersReduced()
const root = ref(null)
const { visible: lit } = useInView(root, { threshold: 0.2 })

const n = (v) => Number(v) || 0
const money = (v) => {
  const x = Number(v) || 0
  if (x >= 1e7) return `₹${(x / 1e7).toFixed(2)}Cr`
  if (x >= 1e5) return `₹${(x / 1e5).toFixed(2)}L`
  if (x >= 1e3) return `₹${(x / 1e3).toFixed(1)}K`
  return `₹${x.toLocaleString()}`
}

// funnel
const rec = computed(() => props.data.recruitment || {})
const openRoles = computed(() => n(rec.value.stats?.open_positions))
const funnel = computed(() => {
  const f = (rec.value.funnel || []).filter((s) => n(s.count) >= 0).slice(0, 5)
  const max = Math.max(1, ...f.map((s) => n(s.count)))
  return f.map((s) => ({ stage: s.stage, count: n(s.count), pct: Math.max(4, (n(s.count) / max) * 100) }))
})

// payroll
const pr = computed(() => props.data.payroll || {})
const currentNet = computed(() => n(pr.value.current_net))
const periodLabel = computed(() => pr.value.period_label || 'current')
const costTrend = computed(() => {
  const t = (pr.value.cost_trend || []).slice(-6)
  const vals = t.map((x) => n(x.net) || n(x.gross))
  const max = Math.max(1, ...vals)
  return t.map((x, i) => ({ label: x.label, short: String(x.label || '').slice(0, 3), value: vals[i], h: Math.max(6, (vals[i] / max) * 100) }))
})

// exits
const ex = computed(() => props.data.exit?.kpis || props.data.exit || {})
const servingNotice = computed(() => n(ex.value.serving_notice ?? props.data.core?.upcoming_exits_30d))
const exitMini = computed(() => [
  { key: 'clr', label: 'Pending clearance', value: n(ex.value.pending_clearances), color: 'var(--hr-notice)' },
  { key: 'set', label: 'Pending settlement', value: n(ex.value.pending_settlements), color: 'var(--hr-orange)' },
  { key: 'rel', label: 'Relieved · 30d', value: n(ex.value.relieved_this_month), color: 'var(--hr-exited)' },
])
</script>

<style scoped>
.isr { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
@media (max-width: 980px) { .isr { grid-template-columns: 1fr; } }

.isr-card { position: relative; overflow: hidden; padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; min-height: 188px; }
.isr-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.isr-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--hr-text-secondary); }
.isr-eyebrow :deep(svg) { color: var(--hr-accent-gold); }
.isr-link { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; color: var(--hr-text-muted); background: var(--hr-input-bg); border: 1px solid var(--hr-border); cursor: pointer; transition: color 0.2s, border-color 0.2s; }
.isr-link:hover { color: var(--hr-accent-gold); border-color: var(--hr-accent-gold-border); }

.isr-hero { display: flex; flex-direction: column; font-size: 26px; font-weight: 850; color: var(--hr-text); letter-spacing: -0.02em; line-height: 1; }
.isr-hero.exit { color: var(--hr-notice); }
.isr-hero small { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--hr-text-dim); margin-top: 4px; }

/* funnel */
.isr-funnel { display: flex; flex-direction: column; gap: 6px; margin-top: auto; }
.isr-fn-row { display: grid; grid-template-columns: 66px 1fr 26px; align-items: center; gap: 8px; }
.isr-fn-lab { font-size: 10px; color: var(--hr-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.isr-fn-track { height: 7px; border-radius: 999px; background: var(--hr-input-bg); overflow: hidden; }
.isr-fn-fill { display: block; height: 100%; border-radius: 999px; background: var(--hr-gradient-hero); transition: width 0.9s var(--hr-spring); }
.isr-fn-val { font-size: 11px; font-weight: 700; color: var(--hr-text-secondary); text-align: right; }

/* payroll bars */
.isr-bars { display: flex; align-items: flex-end; gap: 7px; height: 64px; margin-top: auto; }
.isr-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }
.isr-bar { width: 100%; max-width: 22px; border-radius: 5px 5px 2px 2px; background: color-mix(in srgb, var(--hr-accent-gold) 38%, transparent); transition: height 0.9s var(--hr-spring); }
.isr-bar.on { background: var(--hr-gradient-rail-active); box-shadow: 0 0 12px color-mix(in srgb, var(--hr-accent-gold) 50%, transparent); }
.isr-bar-lab { font-size: 8.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--hr-text-dim); }

/* exits */
.isr-mini { list-style: none; margin: auto 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.isr-mini li { display: grid; grid-template-columns: 10px 1fr auto; align-items: center; gap: 8px; }
.isr-mini-dot { width: 9px; height: 9px; border-radius: 3px; background: var(--tone); }
.isr-mini-lab { font-size: 11.5px; color: var(--hr-text-secondary); }
.isr-mini-val { font-size: 13px; font-weight: 800; color: var(--hr-text); }

.isr-blank { margin-top: auto; font-size: 11.5px; color: var(--hr-text-dim); }

@media (prefers-reduced-motion: reduce) { .isr-fn-fill, .isr-bar { transition: none !important; } }
</style>
