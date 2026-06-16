<template>
  <Motion
    as="article"
    ref="slipRef"
    class="rmb-slip rmb-receipt"
    :style="{ '--cat': catMeta.hex }"
    :initial="{ opacity: 0, y: 18, filter: 'blur(6px)' }"
    :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
    :whileHover="{ y: -4 }"
    :whileTap="{ scale: 0.992 }"
    :transition="{ duration: 0.5, delay: Math.min(index, 9) * 0.05, ease: [0.16, 1, 0.3, 1] }"
    role="button"
    tabindex="0"
    @click="$emit('open', claim)"
    @keydown.enter="$emit('open', claim)"
  >
    <span class="rmb-spotlight" aria-hidden="true" />
    <span class="slip-sheen" aria-hidden="true" />
    <span class="slip-spine" aria-hidden="true" />
    <span class="slip-print" aria-hidden="true" />

    <header class="slip-head">
      <div class="slip-id">
        <span class="cat-dot" :style="{ background: catMeta.hex }"></span>
        <span class="rmb-mono num">{{ claim.claim_number }}</span>
      </div>
      <RmbStatusStamp :status="claim.status" />
    </header>

    <div class="slip-body">
      <div class="slip-cat">
        <span class="slip-cat-ic"><component :is="catMeta.icon" :size="13" /></span>
        <span class="slip-cat-name">{{ claim.category_name || catMeta.label }}</span>
        <span class="dot">·</span>
        <span class="dim rmb-mono">{{ claim.expense_date }}</span>
        <span v-if="claim.employee_name" class="slip-emp">{{ claim.employee_name }}</span>
      </div>
      <p v-if="claim.description" class="slip-desc">{{ claim.description }}</p>
      <div v-if="claim.vendor" class="slip-vendor"><Store :size="11" /> {{ claim.vendor }}</div>
    </div>

    <hr class="rmb-perf-line" />

    <footer class="slip-foot">
      <RmbStageTracker :claim="claim" compact />
      <div class="slip-amount" :class="amountTone">
        <RmbMoneyValue :value="displayAmount" :decimals="0" :tone="amountTone" />
      </div>
    </footer>
  </Motion>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import { Store } from 'lucide-vue-next'
import { categoryMeta } from '@/composables/useReimbursements'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import RmbStatusStamp from './RmbStatusStamp.vue'
import RmbStageTracker from './RmbStageTracker.vue'
import RmbMoneyValue from './RmbMoneyValue.vue'

const props = defineProps({
  claim: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
defineEmits(['open'])

const slipRef = ref(null)
usePointerSpotlight(slipRef)

const catMeta = computed(() => categoryMeta(props.claim.category_code))
const displayAmount = computed(() =>
  ['SETTLED', 'PAID'].includes(props.claim.status) && props.claim.approved_amount != null
    ? props.claim.approved_amount : props.claim.amount)
const amountTone = computed(() =>
  ['SETTLED', 'PAID'].includes(props.claim.status) ? 'positive'
    : (props.claim.status === 'PENDING_APPROVAL' ? 'pending' : ''))
</script>

<style scoped>
.rmb-slip {
  position: relative;
  padding: 15px 18px 16px 22px;
  cursor: pointer;
  overflow: hidden;
  background: linear-gradient(165deg, var(--rmb-paper-elevated), var(--rmb-paper));
  box-shadow: 0 8px 24px -16px rgba(0, 0, 0, 0.6);
  transition: box-shadow 0.35s var(--rmb-spring), border-color 0.3s;
  will-change: transform;
}
.rmb-slip:hover {
  box-shadow: 0 22px 44px -22px color-mix(in srgb, var(--cat, var(--rmb-amber)) 45%, rgba(0,0,0,0.5));
  border-color: color-mix(in srgb, var(--cat, var(--rmb-amber)) 40%, var(--rmb-border-soft));
}
.rmb-slip:focus-visible { outline: 2px solid var(--cat, var(--rmb-amber)); outline-offset: 2px; }

/* category-tinted spine */
.slip-spine { position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--cat, var(--rmb-amber)), color-mix(in srgb, var(--cat, var(--rmb-amber)) 30%, transparent));
  box-shadow: 0 0 12px -1px var(--cat, var(--rmb-amber)); }

/* one-shot thermal "print head" sweep on mount — the slip prints into view */
.slip-print { position: absolute; left: 0; right: 0; top: 0; height: 26px; z-index: 4; pointer-events: none;
  background: linear-gradient(180deg, color-mix(in srgb, var(--cat, var(--rmb-amber)) 38%, transparent), transparent);
  box-shadow: 0 1px 10px 1px color-mix(in srgb, var(--cat, var(--rmb-amber)) 45%, transparent);
  animation: slip-print 0.9s var(--rmb-ease) 1 both; }
@keyframes slip-print {
  0%   { transform: translateY(-26px); opacity: 0; }
  12%  { opacity: 0.9; }
  88%  { opacity: 0.85; }
  100% { transform: translateY(132px); opacity: 0; }
}

/* hover sheen sweep */
.slip-sheen { position: absolute; inset: 0; pointer-events: none; opacity: 0; z-index: 1; border-radius: inherit;
  background: linear-gradient(115deg, transparent 44%, color-mix(in srgb, var(--rmb-amber-bright) 14%, transparent) 50%, transparent 56%);
  background-size: 240% 100%; }
.rmb-slip:hover .slip-sheen { opacity: 1; animation: rmb-amount-shimmer 1.1s var(--rmb-ease) 1; }

.slip-head { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.slip-id { display: flex; align-items: center; gap: 8px; }
.cat-dot { position: relative; width: 9px; height: 9px; border-radius: 50%; flex: 0 0 auto; box-shadow: 0 0 8px -1px var(--cat); }
.cat-dot::after { content: ""; position: absolute; inset: -3px; border-radius: 50%; border: 1px solid var(--cat); opacity: 0;
  animation: cat-dot-ping 2.6s ease-out infinite; }
@keyframes cat-dot-ping { 0% { transform: scale(0.6); opacity: 0.6; } 70%, 100% { transform: scale(1.9); opacity: 0; } }
.slip-id .num { font-size: 12px; font-weight: 700; color: var(--rmb-text); letter-spacing: 0.5px; }
.slip-body { position: relative; z-index: 2; margin-top: 11px; }
.slip-cat { display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600; color: var(--rmb-text-secondary); flex-wrap: wrap; }
.slip-cat-ic { width: 22px; height: 22px; border-radius: 7px; display: grid; place-items: center; flex: 0 0 auto;
  background: color-mix(in srgb, var(--cat) 16%, transparent); color: var(--cat); transition: transform 0.35s var(--rmb-spring); }
.rmb-slip:hover .slip-cat-ic { transform: scale(1.12) rotate(-6deg); }
.slip-cat .dot { opacity: 0.4; }
.slip-cat .dim { color: var(--rmb-text-muted); font-weight: 500; font-size: 11px; }
.slip-emp { margin-left: auto; font-size: 11px; font-weight: 600; color: var(--rmb-text-muted);
  padding: 2px 8px; border-radius: 999px; background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); }
.slip-desc { margin: 9px 0 0; font-size: 12.5px; color: var(--rmb-text); line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.slip-vendor { display: inline-flex; align-items: center; gap: 5px; margin-top: 6px; font-size: 11px; color: var(--rmb-text-muted); }
.slip-foot { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.slip-amount { font-size: 19px; transition: transform 0.3s var(--rmb-spring); transform-origin: right center; }
.rmb-slip:hover .slip-amount { transform: scale(1.06); }
.rmb-slip:hover .slip-amount :deep(.rmb-money-value) { text-shadow: 0 0 18px color-mix(in srgb, var(--cat) 45%, transparent); transition: text-shadow 0.3s; }

@media (prefers-reduced-motion: reduce) {
  .rmb-slip:hover .slip-sheen, .slip-print, .cat-dot::after { animation: none !important; }
}
</style>
