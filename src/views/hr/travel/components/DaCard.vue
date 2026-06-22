<template>
  <div class="dc-shell" :style="{ '--i': index }">
    <div ref="cardEl" class="dc" :class="`st-${rec.status.toLowerCase()}`"
      role="button" tabindex="0" title="View per-diem details"
      @click="$emit('view', rec)" @keydown.enter="$emit('view', rec)">
      <span class="dc-glare" aria-hidden="true" />
      <span class="dc-spine" :style="{ background: meta.hex }" aria-hidden="true" />

      <header class="dc-top">
        <div class="dc-id">
          <span class="dc-name">{{ rec.employee_name || '—' }}</span>
          <button class="dc-ref trv-mono" title="Open source tour" @click.stop="$emit('go', { tab: 'requests', filter: { q: rec.travel_reference_number } })">
            {{ rec.travel_reference_number }} <ArrowUpRight :size="11" />
          </button>
        </div>
        <span class="dc-pill" :style="{ '--c': meta.hex }"><component :is="meta.icon" :size="11" /> {{ meta.label }}</span>
      </header>

      <!-- per-diem accrual strip -->
      <div class="dc-accrual">
        <div class="acc-cells">
          <span v-for="n in shownDays" :key="n" class="acc-cell" :class="{ fill: lit }"
            :style="{ '--c': meta.hex, transitionDelay: (n * 0.045) + 's' }" />
          <span v-if="extraDays > 0" class="acc-more">+{{ extraDays }}</span>
        </div>
        <div class="acc-meta trv-mono">{{ rec.travel_days }}d × {{ fmtINR(rec.daily_rate) }}/day</div>
      </div>

      <div class="dc-amount">
        <div class="amt-block">
          <span class="amt-lab">{{ amtLabel }}</span>
          <DaOdometer :value="Number(rec.approved_da ?? rec.eligible_da ?? 0)" class="amt-odo" />
        </div>
        <span class="dc-tier" :style="{ '--c': cityMeta(rec.city_category).hex }">{{ cityMeta(rec.city_category).label }}</span>
      </div>

      <footer class="dc-foot">
        <span class="dc-grade">{{ rec.grade_name || 'All grades' }} · <span class="trv-mono">{{ fmtDate(rec.computed_at) }}</span></span>
        <div class="dc-act">
          <span v-if="rec.status === 'PAID' && rec.payroll_ref" class="dc-payref trv-mono" title="Payroll reference"><Wallet :size="11" /> {{ rec.payroll_ref }}</span>
          <button class="mini ghost" title="View details" @click.stop="$emit('view', rec)"><Eye :size="13" /> View</button>
          <button v-if="rec.status === 'APPROVED'" class="mini ghost" @click.stop="$emit('go', 'settlement')"><Scale :size="13" /> Settle</button>
          <Motion v-if="rec.status === 'COMPUTED' && canApprove" as="button" class="mini primary" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click.stop="$emit('approve', rec)">
            <Check :size="13" /> Approve
          </Motion>
          <span v-else-if="rec.status === 'COMPUTED'" class="mini locked" title="DA is an estimate until the tour is completed — approve it after the trip ends">
            <Clock :size="13" /> Awaiting trip end
          </span>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Check, Clock, ArrowUpRight, Wallet, Scale, Calculator, CheckCircle2, BadgeCheck, RotateCcw, Eye } from 'lucide-vue-next'
import DaOdometer from './DaOdometer.vue'
import { fmtINR, fmtDate, cityMeta } from '@/composables/useTravel'
import { usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({ rec: { type: Object, required: true }, index: { type: Number, default: 0 } })
defineEmits(['approve', 'go', 'view'])

const cardEl = ref(null)
const lit = ref(false)
usePointerSpotlight(cardEl)

const DA_META = {
  COMPUTED: { label: 'Computed', icon: Calculator, hex: '#fbbf24' },
  APPROVED: { label: 'Approved', icon: CheckCircle2, hex: '#34d399' },
  PAID: { label: 'Paid', icon: BadgeCheck, hex: '#60d394' },
  REVERSED: { label: 'Reversed', icon: RotateCcw, hex: '#c084fc' },
}
const meta = computed(() => DA_META[props.rec.status] || { label: props.rec.status, icon: Calculator, hex: '#9ca3af' })
// DA can only be finalised once the underlying tour is completed.
const canApprove = computed(() => props.rec.request_status === 'COMPLETED')
const amtLabel = computed(() => {
  if (props.rec.approved_da != null) return 'Approved DA'
  if (props.rec.status === 'COMPUTED' && props.rec.request_status !== 'COMPLETED') return 'Estimated DA'
  return 'Eligible DA'
})
const shownDays = computed(() => Math.min(16, Math.max(0, Number(props.rec.travel_days) || 0)))
const extraDays = computed(() => Math.max(0, (Number(props.rec.travel_days) || 0) - 16))

onMounted(() => {
  if (prefersReduced()) { lit.value = true; return }
  requestAnimationFrame(() => requestAnimationFrame(() => { lit.value = true }))
})
</script>

<style scoped>
.dc-shell { animation: trv-deal 0.5s var(--trv-spring) backwards; animation-delay: calc(var(--i) * 0.05s); }
.dc { position: relative; overflow: hidden; border-radius: 16px; padding: 15px 17px; cursor: pointer;
  background: var(--trv-surface); border: 1px solid var(--trv-border); box-shadow: var(--trv-card-shadow);
  transition: transform 0.25s var(--trv-spring), box-shadow 0.25s, border-color 0.25s; }
.dc:focus-visible { outline: 2px solid var(--trv-amber-border); outline-offset: 2px; }
.dc:hover { transform: perspective(1100px) rotateX(calc((var(--my,.5) - .5) * -4deg)) rotateY(calc((var(--mx,.5) - .5) * 6deg)) translateY(-3px); box-shadow: var(--trv-shadow-hover); border-color: var(--trv-amber-border); }
.dc-glare { position: absolute; inset: 0; opacity: var(--spot, 0); pointer-events: none; background: radial-gradient(320px circle at calc(var(--mx,.5)*100%) calc(var(--my,.5)*100%), rgba(251,191,36,0.13), transparent 60%); transition: opacity 0.3s; }
.dc-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }

.dc-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 13px; }
.dc-id { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.dc-name { font-size: 13.5px; font-weight: 700; color: var(--trv-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dc-ref { display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; color: var(--trv-amber-bright); background: none; border: none; padding: 0; cursor: pointer; }
.dc-ref:hover { text-decoration: underline; }
.dc-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 999px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); flex-shrink: 0; }

.dc-accrual { margin-bottom: 13px; }
.acc-cells { display: flex; flex-wrap: wrap; gap: 3px; margin-bottom: 7px; align-items: center; }
.acc-cell { width: 14px; height: 18px; border-radius: 3px; background: var(--trv-steel-soft); border: 1px solid var(--trv-border); transition: background 0.4s var(--trv-spring), border-color 0.4s, box-shadow 0.4s; }
.acc-cell.fill { background: color-mix(in srgb, var(--c) 80%, transparent); border-color: var(--c); box-shadow: 0 0 7px color-mix(in srgb, var(--c) 45%, transparent); }
.acc-more { font-size: 10px; font-weight: 700; color: var(--trv-text-muted); margin-left: 3px; }
.acc-meta { font-size: 11px; color: var(--trv-text-muted); }

.dc-amount { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; padding: 11px 0; border-top: 1px dashed var(--trv-border); border-bottom: 1px dashed var(--trv-border); margin-bottom: 12px; }
.amt-block { display: flex; flex-direction: column; gap: 3px; }
.amt-lab { font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trv-text-dim); }
.amt-odo { font-size: 23px; --odo-color: var(--trv-amber-strong); }
.dc-tier { font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 7px; color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }

.dc-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.dc-grade { font-size: 10.5px; color: var(--trv-text-dim); }
.dc-act { display: flex; align-items: center; gap: 7px; }
.dc-payref { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; color: var(--trv-st-completed); }
.mini { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 9px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.mini.primary { background: var(--trv-grad-hero); color: #1a1205; }
.mini.ghost { background: transparent; border: 1px solid var(--trv-border-strong); color: var(--trv-text-secondary); }
.mini.ghost:hover { border-color: var(--trv-amber-border); color: var(--trv-text); }
.mini.locked { cursor: help; background: var(--trv-steel-soft); border: 1px dashed var(--trv-border-strong); color: var(--trv-text-muted); font-weight: 650; }

@media (prefers-reduced-motion: reduce) { .dc-shell { animation: none; } .dc:hover { transform: translateY(-2px); } .acc-cell { transition: none; } }
</style>
