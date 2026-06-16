<template>
  <Motion as="article" class="rsm" ref="cardRef" :style="{ '--cat': hex }"
    :initial="{ opacity: 0, y: 22, filter: 'blur(6px)' }"
    :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
    :whileHover="{ y: -4 }"
    :transition="{ duration: 0.5, delay: Math.min(index, 8) * 0.06, ease: [0.16, 1, 0.3, 1] }"
    :data-state="state">
    <span class="rmb-spotlight" aria-hidden="true" />
    <span class="rsm-sheen" aria-hidden="true" />
    <span v-if="state === 'over'" class="rsm-alert-aura" aria-hidden="true" />

    <header class="rsm-head">
      <span class="rsm-ic"><component :is="icon" :size="15" /></span>
      <span class="rsm-name">{{ item.category_name }}</span>
      <span v-if="state !== 'ok'" class="rsm-flag" :data-state="state">
        <AlertTriangle :size="11" /> {{ state === 'over' ? 'Over' : 'Near' }}
      </span>
    </header>

    <!-- arc gauge -->
    <div class="rsm-arc">
      <svg :viewBox="`0 0 ${W} ${H}`" class="rsm-arc-svg">
        <defs>
          <linearGradient :id="`${uid}-g`" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" :stop-color="arcColorA" />
            <stop offset="100%" :stop-color="arcColorB" />
          </linearGradient>
        </defs>
        <path :d="arcPath" fill="none" stroke="var(--rmb-grid-line)" :stroke-width="STROKE" stroke-linecap="round" />
        <path :d="arcPath" fill="none" :stroke="`url(#${uid}-g)`" :stroke-width="STROKE" stroke-linecap="round"
          :stroke-dasharray="arcLen" :stroke-dashoffset="dashOffset" class="rsm-arc-fill" />
      </svg>
      <div class="rsm-arc-center">
        <span class="rsm-pct rmb-mono">
          <RmbCountUp v-if="hasLimit" :value="pct" :decimals="0" suffix="%" />
          <template v-else>∞</template>
        </span>
        <span class="rsm-pct-lbl">{{ hasLimit ? 'of limit' : 'no cap' }}</span>
      </div>
    </div>

    <div class="rsm-amts">
      <div class="rsm-amt">
        <span class="lbl">Spent</span>
        <span class="val rmb-mono">{{ fmtCompactINR(item.spent_this_month) }}</span>
      </div>
      <div class="rsm-amt" v-if="hasLimit">
        <span class="lbl">Limit</span>
        <span class="val rmb-mono dim">{{ fmtCompactINR(item.max_amount_per_month) }}</span>
      </div>
      <div class="rsm-amt" v-else>
        <span class="lbl">This FY</span>
        <span class="val rmb-mono dim">{{ fmtCompactINR(item.spent_this_year) }}</span>
      </div>
    </div>

    <footer class="rsm-foot">
      <span class="rsm-claims rmb-mono">{{ item.claims_this_month }} this month</span>
      <span v-if="item.max_claims_per_month" class="rsm-cap rmb-mono">cap {{ item.max_claims_per_month }}</span>
    </footer>
  </Motion>
</template>

<script>
let _rsmUid = 0
</script>

<script setup>
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import { AlertTriangle } from 'lucide-vue-next'
import RmbCountUp from './RmbCountUp.vue'
import { categoryMeta, fmtCompactINR } from '@/composables/useReimbursements'
import { usePointerSpotlight, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  item: { type: Object, required: true },
  index: { type: Number, default: 0 },
})

const cardRef = ref(null)
usePointerSpotlight(cardRef)
const { visible } = useInView(cardRef, { threshold: 0.3 })

const uid = `rsm-${_rsmUid++}`
// 180° arc geometry
const W = 160, H = 92, STROKE = 11
const cx = W / 2, cy = H - 8, r = 64
const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
const arcLen = Math.PI * r

const cat = computed(() => categoryMeta(props.item.category_code))
const icon = computed(() => cat.value.icon)
const hex = computed(() => props.item.color_hex || cat.value.hex)

const hasLimit = computed(() => Number(props.item.max_amount_per_month) > 0)
const spent = computed(() => Number(props.item.spent_this_month) || 0)
const pct = computed(() => hasLimit.value
  ? Math.min(999, Math.round((spent.value / Number(props.item.max_amount_per_month)) * 100)) : 0)

const state = computed(() => {
  if (!hasLimit.value) return 'ok'
  if (pct.value >= 100) return 'over'
  if (pct.value >= 80) return 'near'
  return 'ok'
})

const fillFrac = computed(() => {
  if (!hasLimit.value) return Math.min(1, spent.value > 0 ? 0.18 : 0)
  return Math.min(1, pct.value / 100)
})
const dashOffset = computed(() => visible.value ? arcLen * (1 - fillFrac.value) : arcLen)

const arcColorA = computed(() =>
  state.value === 'over' ? 'var(--rmb-st-rejected)'
    : state.value === 'near' ? 'var(--rmb-st-returned)' : hex.value)
const arcColorB = computed(() =>
  state.value === 'over' ? 'var(--rmb-st-rejected)'
    : state.value === 'near' ? 'var(--rmb-st-pending)' : 'var(--rmb-st-settled)')
</script>

<style scoped>
.rsm { position: relative; padding: 16px 16px 14px; border-radius: 16px; overflow: hidden;
  background: var(--rmb-surf-card); border: 1px solid var(--rmb-border-soft); box-shadow: var(--rmb-card-shadow);
  transition: border-color 0.3s, box-shadow 0.3s; will-change: transform; }
.rsm:hover { border-color: color-mix(in srgb, var(--cat) 40%, var(--rmb-border-soft));
  box-shadow: 0 22px 46px -26px color-mix(in srgb, var(--cat) 42%, rgba(0,0,0,0.5)); }
.rsm[data-state="over"] { border-color: color-mix(in srgb, var(--rmb-st-rejected) 38%, var(--rmb-border-soft)); }

.rsm-sheen { position: absolute; inset: 0; pointer-events: none; opacity: 0; z-index: 2; border-radius: inherit;
  background: linear-gradient(115deg, transparent 44%, color-mix(in srgb, var(--rmb-amber-bright) 14%, transparent) 50%, transparent 56%); background-size: 240% 100%; }
.rsm:hover .rsm-sheen { opacity: 1; animation: rmb-amount-shimmer 1.1s var(--rmb-ease) 1; }
.rsm-alert-aura { position: absolute; inset: 0; pointer-events: none; z-index: 0; border-radius: inherit;
  background: radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--rmb-st-rejected) 16%, transparent), transparent 60%);
  animation: rmb-aura-breathe 3.4s ease-in-out infinite; }
.rsm > * { position: relative; z-index: 1; }

.rsm-head { display: flex; align-items: center; gap: 9px; }
.rsm-ic { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; flex: 0 0 auto;
  background: color-mix(in srgb, var(--cat) 16%, transparent); color: var(--cat); }
.rsm-name { font-size: 13px; font-weight: 700; color: var(--rmb-text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rsm-flag { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
  padding: 3px 7px; border-radius: 999px; }
.rsm-flag[data-state="near"] { color: var(--rmb-st-returned); background: var(--rmb-st-returned-soft); }
.rsm-flag[data-state="over"] { color: var(--rmb-st-rejected); background: var(--rmb-st-rejected-soft); }

.rsm-arc { position: relative; display: grid; place-items: center; margin: 6px 0 2px; }
.rsm-arc-svg { width: 150px; height: auto; overflow: visible; }
.rsm-arc-fill { transition: stroke-dashoffset 1.3s var(--rmb-spring); filter: drop-shadow(0 2px 8px color-mix(in srgb, var(--cat) 35%, transparent)); }
.rsm-arc-center { position: absolute; bottom: 4px; display: flex; flex-direction: column; align-items: center; gap: 0; }
.rsm-pct { font-size: 22px; font-weight: 800; color: var(--rmb-text); line-height: 1; }
.rsm[data-state="over"] .rsm-pct { color: var(--rmb-st-rejected); }
.rsm[data-state="near"] .rsm-pct { color: var(--rmb-st-returned); }
.rsm-pct-lbl { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--rmb-text-muted); margin-top: 2px; }

.rsm-amts { display: flex; justify-content: space-between; gap: 10px; padding: 8px 2px 2px; border-top: 1px dotted var(--rmb-perf-color); }
.rsm-amt { display: flex; flex-direction: column; gap: 2px; }
.rsm-amt .lbl { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--rmb-text-muted); }
.rsm-amt .val { font-size: 14px; font-weight: 700; color: var(--rmb-text); }
.rsm-amt .val.dim { color: var(--rmb-text-muted); font-weight: 600; }

.rsm-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 8px; }
.rsm-claims { font-size: 10.5px; color: var(--rmb-text-secondary); }
.rsm-cap { font-size: 10px; color: var(--rmb-text-muted); padding: 2px 7px; border-radius: 999px;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); }

@media (prefers-reduced-motion: reduce) {
  .rsm:hover .rsm-sheen, .rsm-alert-aura { animation: none !important; }
  .rsm-arc-fill { transition: none; }
}
</style>
