<template>
  <Motion ref="root" as="section" class="wst hr-card"
    :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }">
    <span class="hr-grain" aria-hidden="true" />
    <header class="wst-head">
      <span class="wst-eyebrow"><Layers :size="13" /> Workforce Composition</span>
      <span v-if="hires > 0" class="wst-badge"><Sparkles :size="11" /> +{{ hires }} · 30d</span>
    </header>

    <div class="wst-body">
      <!-- strata column -->
      <button class="wst-col" type="button" @click="$emit('go', '/admin/hr/employees/all')" :title="`${total} on the books`">
        <span class="wst-total"><HrCountUp :value="total" :start="lit" /><small>people</small></span>
        <span class="wst-stack">
          <span v-for="(s, i) in segments" :key="s.key" class="wst-seg" :data-key="s.key"
            :style="{ height: lit ? s.pct + '%' : '0%', '--tone': s.color, transitionDelay: (0.12 + i * 0.09) + 's' }">
            <span v-if="s.pct >= 9" class="wst-seg-lab hr-mono">{{ s.value }}</span>
          </span>
        </span>
      </button>

      <!-- legend -->
      <ul class="wst-legend">
        <Motion v-for="(s, i) in segments" :key="s.key" as="li"
          :initial="reduced ? false : { opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.36, delay: 0.2 + i * 0.07 }">
          <button class="wst-row" type="button" :style="{ '--tone': s.color }" @click="$emit('go', s.target)">
            <span class="wst-dot" />
            <span class="wst-name">{{ s.label }}</span>
            <span class="wst-val hr-mono"><HrCountUp :value="s.value" :start="lit" /></span>
            <span class="wst-pct hr-mono">{{ s.pct.toFixed(0) }}%</span>
          </button>
        </Motion>
      </ul>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Layers, Sparkles } from 'lucide-vue-next'
import HrCountUp from '@/components/hr/HrCountUp.vue'
import { prefersReduced, useInView } from '@/composables/useShiftMotion'

const props = defineProps({ data: { type: Object, default: () => ({}) } })
defineEmits(['go'])
const reduced = prefersReduced()
const root = ref(null)
const { visible: lit } = useInView(root, { threshold: 0.3 })

const n = (v) => Number(v) || 0
const total = computed(() => n(props.data.core?.total_employees))
const hires = computed(() => n(props.data.core?.recent_hires_30d))

const segments = computed(() => {
  const c = props.data.core || {}
  const probation = n(c.employees_on_probation)
  const activePure = Math.max(0, n(c.active_employees) - probation)
  const notice = n(c.employees_on_notice)
  const suspended = n(c.employees_suspended)
  const other = Math.max(0, total.value - activePure - probation - notice - suspended)
  const rows = [
    { key: 'active', label: 'Active', value: activePure, color: 'var(--hr-active)', target: '/admin/hr/employees/all' },
    { key: 'probation', label: 'On Probation', value: probation, color: 'var(--hr-probation)', target: '/admin/hr/employees/probation' },
    { key: 'notice', label: 'On Notice', value: notice, color: 'var(--hr-notice)', target: '/admin/hr/employees/lifecycle' },
    { key: 'suspended', label: 'Suspended', value: suspended, color: 'var(--hr-suspended)', target: '/admin/hr/employees/suspended' },
    { key: 'other', label: 'Inactive · Exited', value: other, color: 'var(--hr-inactive)', target: '/admin/hr/employees/inactive' },
  ]
  const sum = Math.max(1, rows.reduce((a, r) => a + r.value, 0))
  return rows.map((r) => ({ ...r, pct: (r.value / sum) * 100 }))
})
</script>

<style scoped>
.wst { position: relative; overflow: hidden; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
.wst-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.wst-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--hr-text-secondary); }
.wst-eyebrow :deep(svg) { color: var(--hr-accent-gold); }
.wst-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 800; padding: 3px 9px; border-radius: 999px;
  color: var(--hr-active); background: var(--hr-active-soft); border: 1px solid color-mix(in srgb, var(--hr-active) 30%, transparent); }

.wst-body { display: grid; grid-template-columns: 120px 1fr; gap: 18px; flex: 1; align-items: stretch; }

.wst-col { position: relative; display: flex; flex-direction: column; gap: 10px; align-items: center; cursor: pointer; background: none; border: none; font: inherit; padding: 0; }
.wst-total { display: flex; flex-direction: column; align-items: center; font-size: 24px; font-weight: 850; color: var(--hr-text); letter-spacing: -0.02em; line-height: 1; }
.wst-total small { font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--hr-text-dim); margin-top: 3px; }
.wst-stack { position: relative; flex: 1; width: 64px; display: flex; flex-direction: column-reverse; gap: 3px; border-radius: 14px; padding: 4px;
  background: var(--hr-input-bg); border: 1px solid var(--hr-border); min-height: 150px; }
.wst-seg { position: relative; width: 100%; border-radius: 8px; overflow: hidden; min-height: 3px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--tone) 92%, transparent), color-mix(in srgb, var(--tone) 58%, transparent));
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 28%, transparent);
  transition: height 0.9s var(--hr-spring); }
.wst-col:hover .wst-seg[data-key="active"]::after { content: ''; position: absolute; inset: 0;
  background: linear-gradient(100deg, transparent 30%, color-mix(in srgb, #fff 30%, transparent) 50%, transparent 70%);
  background-size: 220% 100%; animation: wst-sheen 1.4s ease; }
@keyframes wst-sheen { from { background-position: 200% 0; } to { background-position: -120% 0; } }
.wst-seg-lab { position: absolute; inset: 0; display: grid; place-items: center; font-size: 10px; font-weight: 800; color: #0b0b0c; opacity: 0.82; }

.wst-legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; justify-content: center; }
.wst-row { display: grid; grid-template-columns: 14px 1fr auto auto; align-items: center; gap: 9px; width: 100%; padding: 7px 9px; border-radius: 10px;
  background: none; border: 1px solid transparent; cursor: pointer; font: inherit; text-align: left;
  transition: background 0.2s, border-color 0.2s, transform 0.2s var(--hr-spring); }
.wst-row:hover { background: var(--hr-surface); border-color: var(--hr-border); transform: translateX(3px); }
.wst-dot { width: 11px; height: 11px; border-radius: 4px; background: var(--tone); box-shadow: 0 0 10px color-mix(in srgb, var(--tone) 60%, transparent); }
.wst-name { font-size: 12.5px; color: var(--hr-text-secondary); }
.wst-val { font-size: 14px; font-weight: 800; color: var(--hr-text); }
.wst-pct { font-size: 11px; color: var(--hr-text-dim); min-width: 30px; text-align: right; }

@media (prefers-reduced-motion: reduce) { .wst-seg { transition: none !important; } }
</style>
