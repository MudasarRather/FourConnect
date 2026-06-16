<template>
  <div class="rss" ref="rootRef">
    <div class="rss-bar">
      <div class="rss-seg payroll" :style="{ width: (visible ? payrollPct : 0) + '%' }" :class="{ on: hover === 'payroll' }"
        @mouseenter="hover = 'payroll'" @mouseleave="hover = ''">
        <span class="rss-flow" aria-hidden="true" />
      </div>
      <div class="rss-seg direct" :style="{ width: (visible ? directPct : 0) + '%' }" :class="{ on: hover === 'direct' }"
        @mouseenter="hover = 'direct'" @mouseleave="hover = ''">
        <span class="rss-flow" aria-hidden="true" />
      </div>
      <span v-if="total <= 0" class="rss-empty-bar" />
    </div>

    <div class="rss-stats">
      <button class="rss-stat" :class="{ on: hover === 'payroll' }" @mouseenter="hover = 'payroll'" @mouseleave="hover = ''">
        <span class="rs-top"><i class="dot payroll" /> Payroll <em class="rmb-mono">{{ payrollPct }}%</em></span>
        <span class="rs-amt rmb-mono"><span class="cur">₹</span><RmbCountUp :value="payroll" :decimals="0" /></span>
        <span class="rs-sub rmb-mono">{{ payrollCount }} settled via salary</span>
      </button>
      <button class="rss-stat" :class="{ on: hover === 'direct' }" @mouseenter="hover = 'direct'" @mouseleave="hover = ''">
        <span class="rs-top"><i class="dot direct" /> Direct <em class="rmb-mono">{{ directPct }}%</em></span>
        <span class="rs-amt rmb-mono"><span class="cur">₹</span><RmbCountUp :value="direct" :decimals="0" /></span>
        <span class="rs-sub rmb-mono">{{ directCount }} bank · cash · cheque</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import RmbCountUp from './RmbCountUp.vue'
import { useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  payroll: { type: [Number, String], default: 0 },
  direct: { type: [Number, String], default: 0 },
  payrollCount: { type: Number, default: 0 },
  directCount: { type: Number, default: 0 },
})

const rootRef = ref(null)
const hover = ref('')
const { visible } = useInView(rootRef, { threshold: 0.3 })

const payroll = computed(() => Number(props.payroll) || 0)
const direct = computed(() => Number(props.direct) || 0)
const total = computed(() => payroll.value + direct.value)
const payrollPct = computed(() => total.value > 0 ? Math.round((payroll.value / total.value) * 100) : 0)
const directPct = computed(() => total.value > 0 ? 100 - payrollPct.value : 0)
</script>

<style scoped>
.rss { display: flex; flex-direction: column; gap: 16px; }
.rss-bar { position: relative; display: flex; height: 26px; border-radius: 999px; overflow: hidden; background: var(--rmb-grid-line); }
.rss-seg { position: relative; height: 100%; overflow: hidden; transition: width 1.1s var(--rmb-ease), filter 0.25s; min-width: 0; }
.rss-seg.payroll { background: linear-gradient(90deg, color-mix(in srgb, var(--rmb-st-settled) 70%, transparent), var(--rmb-st-settled)); }
.rss-seg.direct { background: linear-gradient(90deg, color-mix(in srgb, var(--rmb-ember) 70%, transparent), var(--rmb-ember)); }
.rss-seg.on { filter: brightness(1.14); }
.rss-flow { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 35%, rgba(255,255,255,0.5) 50%, transparent 65%);
  background-size: 220% 100%; animation: rss-flow 2.8s linear infinite; }
.rss-empty-bar { position: absolute; inset: 0; }

.rss-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.rss-stat { display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; border-radius: 13px; text-align: left; cursor: default;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); transition: border-color 0.25s, transform 0.25s, background 0.25s; }
.rss-stat.on { transform: translateY(-2px); border-color: var(--rmb-border-strong); background: var(--rmb-surface-elevated); }
.rs-top { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; color: var(--rmb-text-secondary); }
.rs-top em { margin-left: auto; font-style: normal; font-size: 11px; color: var(--rmb-text-muted); }
.dot { width: 9px; height: 9px; border-radius: 3px; }
.dot.payroll { background: var(--rmb-st-settled); }
.dot.direct { background: var(--rmb-ember); }
.rs-amt { font-size: 19px; font-weight: 800; color: var(--rmb-text); display: inline-flex; align-items: baseline; gap: 1px; }
.rs-amt .cur { font-size: 0.66em; opacity: 0.72; }
.rs-sub { font-size: 9.5px; color: var(--rmb-text-muted); }

@keyframes rss-flow { 0% { background-position: 130% 0; } 100% { background-position: -60% 0; } }
@media (prefers-reduced-motion: reduce) { .rss-seg { transition: width 0.4s; } .rss-flow { display: none; } }
</style>
