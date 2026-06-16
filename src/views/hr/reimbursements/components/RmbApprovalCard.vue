<template>
  <Motion as="article" ref="cardRef" class="rac rmb-receipt" :class="{ busy, decided: !!decided }"
    :style="{ '--cat': hex }"
    :initial="{ opacity: 0, y: 22, filter: 'blur(7px)' }"
    :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
    :whileHover="decided ? {} : { y: -5 }"
    :transition="{ duration: 0.55, delay: Math.min(index, 9) * 0.06, ease: [0.16, 1, 0.3, 1] }">

    <span class="rmb-spotlight" aria-hidden="true" />
    <span class="rac-sheen" aria-hidden="true" />
    <span class="rac-spine" aria-hidden="true" />
    <span class="rac-print" aria-hidden="true" />

    <!-- ── header ── -->
    <header class="rac-head" @click="!decided && $emit('open', claim)">
      <span class="rac-cat-ic"><component :is="catMeta.icon" :size="14" /></span>
      <div class="rac-id">
        <span class="rac-num rmb-mono">{{ claim.claim_number }}</span>
        <span class="rac-cat-name">{{ claim.category_name || catMeta.label }}</span>
      </div>
      <RmbStatusStamp :status="claim.status" />
    </header>

    <!-- ── employee + amount ── -->
    <div class="rac-mid" @click="!decided && $emit('open', claim)">
      <div class="rac-emp">
        <Motion as="span" class="rac-ava"
          :initial="{ scale: 0, rotate: -18 }" :animate="{ scale: 1, rotate: 0 }"
          :transition="{ delay: 0.18 + Math.min(index, 9) * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
          {{ initials }}
        </Motion>
        <div class="rac-emp-meta">
          <b>{{ claim.employee_name || 'Direct report' }}</b>
          <small class="rmb-mono">{{ claim.expense_date }}<template v-if="claim.vendor"> · {{ claim.vendor }}</template></small>
        </div>
      </div>
      <div class="rac-amt">
        <span class="rac-amt-lbl">Claimed</span>
        <RmbMoneyValue :value="claim.amount" :decimals="0" tone="pending" />
      </div>
    </div>

    <p v-if="claim.description" class="rac-desc" @click="!decided && $emit('open', claim)">{{ claim.description }}</p>

    <hr class="rmb-perf-line" />

    <!-- ── pipeline ── -->
    <div class="rac-track"><RmbStageTracker :claim="claim" compact /></div>

    <!-- ── actions ── -->
    <footer class="rac-foot">
      <Motion as="button" class="rmb-btn rac-btn approve"
        :whileHover="{ y: -2, scale: 1.03 }" :whileTap="{ scale: 0.95 }"
        :disabled="busy" @click.stop="$emit('act', 'approve')">
        <Check :size="14" :stroke-width="2.6" /> Approve
      </Motion>
      <Motion as="button" class="rmb-btn rac-btn return"
        :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }"
        :disabled="busy" @click.stop="$emit('act', 'return')">
        <Undo2 :size="13" /> Return
      </Motion>
      <Motion as="button" class="rmb-btn rac-btn reject"
        :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }"
        :disabled="busy" @click.stop="$emit('act', 'reject')">
        <X :size="14" :stroke-width="2.6" /> Reject
      </Motion>
    </footer>

    <!-- ── busy shimmer ── -->
    <span v-if="busy && !decided" class="rac-busy" aria-hidden="true"><i /></span>

    <!-- ── decision verdict overlay (stamp press + wash) ── -->
    <Transition name="rac-vfade">
      <div v-if="decided" class="rac-verdict" :data-d="decided">
        <span class="rac-wash" aria-hidden="true" />
        <Motion as="span" class="rac-stamp"
          :initial="{ scale: 1.7, opacity: 0, rotate: -20 }"
          :animate="{ scale: 1, opacity: 1, rotate: -8 }"
          :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
          <component :is="verdict.icon" :size="22" :stroke-width="2.6" /> {{ verdict.label }}
        </Motion>
        <span class="rac-burst" aria-hidden="true"><i v-for="n in 8" :key="n" :style="burst(n)" /></span>
      </div>
    </Transition>
  </Motion>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import { Check, X, Undo2, CheckCircle2, XCircle } from 'lucide-vue-next'
import { categoryMeta } from '@/composables/useReimbursements'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import RmbStatusStamp from './RmbStatusStamp.vue'
import RmbStageTracker from './RmbStageTracker.vue'
import RmbMoneyValue from './RmbMoneyValue.vue'

const props = defineProps({
  claim: { type: Object, required: true },
  busy: { type: Boolean, default: false },
  decided: { type: String, default: null },   // null | 'approve' | 'return' | 'reject'
  index: { type: Number, default: 0 },
})
defineEmits(['open', 'act'])

const cardRef = ref(null)
usePointerSpotlight(cardRef)

const catMeta = computed(() => categoryMeta(props.claim.category_code))
const hex = computed(() => props.claim.color_hex || catMeta.value.hex)
const initials = computed(() => {
  const n = props.claim.employee_name || 'D R'
  return n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'DR'
})
const VERDICT = {
  approve: { label: 'APPROVED', icon: CheckCircle2 },
  reject: { label: 'REJECTED', icon: XCircle },
  return: { label: 'RETURNED', icon: Undo2 },
}
const verdict = computed(() => VERDICT[props.decided] || VERDICT.approve)

// deterministic confetti spark directions
const burst = (n) => {
  const ang = (n / 8) * Math.PI * 2
  const d = 54 + (n % 3) * 14
  return { '--bx': (Math.cos(ang) * d).toFixed(1) + 'px', '--by': (Math.sin(ang) * d).toFixed(1) + 'px', animationDelay: (n * 0.03).toFixed(2) + 's' }
}
</script>

<style scoped>
.rac {
  position: relative; padding: 16px 18px 15px 22px; overflow: hidden; cursor: default;
  display: flex; flex-direction: column; gap: 11px;
  background: linear-gradient(165deg, var(--rmb-paper-elevated), var(--rmb-paper));
  box-shadow: 0 10px 28px -18px rgba(0,0,0,0.6);
  transition: box-shadow 0.4s var(--rmb-spring), border-color 0.3s, transform 0.4s var(--rmb-spring), opacity 0.5s, filter 0.5s;
  will-change: transform;
}
.rac:hover { box-shadow: 0 26px 50px -24px color-mix(in srgb, var(--cat, var(--rmb-amber)) 45%, rgba(0,0,0,0.5));
  border-color: color-mix(in srgb, var(--cat, var(--rmb-amber)) 40%, var(--rmb-border-soft)); }
.rac.busy { opacity: 0.7; pointer-events: none; }
.rac.decided { pointer-events: none; }

/* category-tinted spine */
.rac-spine { position: absolute; left: 0; top: 9px; bottom: 9px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--cat, var(--rmb-amber)), color-mix(in srgb, var(--cat, var(--rmb-amber)) 30%, transparent));
  box-shadow: 0 0 12px -1px var(--cat, var(--rmb-amber)); }

/* hover sheen */
.rac-sheen { position: absolute; inset: 0; pointer-events: none; opacity: 0; z-index: 1; border-radius: inherit;
  background: linear-gradient(115deg, transparent 44%, color-mix(in srgb, var(--rmb-amber-bright) 14%, transparent) 50%, transparent 56%);
  background-size: 240% 100%; }
.rac:hover .rac-sheen { opacity: 1; animation: rmb-amount-shimmer 1.1s var(--rmb-ease) 1; }

/* one-shot thermal print head sweep on mount */
.rac-print { position: absolute; left: 0; right: 0; top: 0; height: 28px; z-index: 4; pointer-events: none;
  background: linear-gradient(180deg, color-mix(in srgb, var(--cat, var(--rmb-amber)) 38%, transparent), transparent);
  box-shadow: 0 1px 10px 1px color-mix(in srgb, var(--cat, var(--rmb-amber)) 45%, transparent);
  animation: rac-print 0.95s var(--rmb-ease) 1 both; }
@keyframes rac-print { 0% { transform: translateY(-28px); opacity: 0; } 12% { opacity: 0.9; } 90% { opacity: 0.85; } 100% { transform: translateY(260px); opacity: 0; } }

.rac > :not(.rac-spine):not(.rac-sheen):not(.rac-print):not(.rmb-spotlight):not(.rac-busy):not(.rac-verdict) { position: relative; z-index: 2; }

/* header */
.rac-head { display: flex; align-items: center; gap: 9px; cursor: pointer; }
.rac-cat-ic { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; flex: 0 0 auto;
  background: color-mix(in srgb, var(--cat) 16%, transparent); color: var(--cat); transition: transform 0.35s var(--rmb-spring); }
.rac:hover .rac-cat-ic { transform: scale(1.12) rotate(-6deg); }
.rac-id { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
.rac-num { font-size: 12px; font-weight: 700; color: var(--rmb-text); letter-spacing: 0.4px; }
.rac-cat-name { font-size: 11px; color: var(--rmb-text-muted); }

/* mid */
.rac-mid { display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; }
.rac-emp { display: flex; align-items: center; gap: 10px; min-width: 0; }
.rac-ava { width: 34px; height: 34px; border-radius: 11px; display: grid; place-items: center; flex: 0 0 auto;
  font-size: 12px; font-weight: 800; color: #2a1a06; background: var(--hr-gradient-hero);
  box-shadow: 0 8px 18px -8px color-mix(in srgb, var(--cat) 55%, rgba(0,0,0,0.4)); }
.rac-emp-meta { display: flex; flex-direction: column; min-width: 0; }
.rac-emp-meta b { font-size: 13px; color: var(--rmb-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rac-emp-meta small { font-size: 10.5px; color: var(--rmb-text-muted); }
.rac-amt { display: flex; flex-direction: column; align-items: flex-end; flex: 0 0 auto; }
.rac-amt-lbl { font-size: 8.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--rmb-text-muted); }
.rac-amt :deep(.rmb-money-value) { font-size: 19px; transition: transform 0.3s var(--rmb-spring); transform-origin: right; }
.rac:hover .rac-amt :deep(.rmb-money-value) { transform: scale(1.06); }

.rac-desc { margin: 0; font-size: 12px; color: var(--rmb-text-secondary); line-height: 1.45; cursor: pointer;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.rac-track { display: flex; }

/* footer actions */
.rac-foot { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 7px; }
.rac-btn { font-size: 12px; padding: 9px 10px; gap: 5px; }
.rac-btn.approve { background: var(--rmb-st-approved-soft); color: var(--rmb-st-approved); border: 1px solid color-mix(in srgb, var(--rmb-st-approved) 35%, transparent); }
.rac-btn.approve:hover { background: color-mix(in srgb, var(--rmb-st-approved) 22%, transparent); box-shadow: 0 10px 22px -12px color-mix(in srgb, var(--rmb-st-approved) 60%, transparent); }
.rac-btn.return { background: var(--rmb-surface); color: var(--rmb-st-returned); border: 1px solid var(--rmb-border-soft); }
.rac-btn.return:hover { border-color: color-mix(in srgb, var(--rmb-st-returned) 45%, transparent); }
.rac-btn.reject { background: var(--rmb-st-rejected-soft); color: var(--rmb-st-rejected); border: 1px solid color-mix(in srgb, var(--rmb-st-rejected) 30%, transparent); }
.rac-btn.reject:hover { background: color-mix(in srgb, var(--rmb-st-rejected) 20%, transparent); }

/* busy bar */
.rac-busy { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; z-index: 5; overflow: hidden; background: var(--rmb-surface); }
.rac-busy i { position: absolute; inset: 0; width: 40%; border-radius: 3px; background: var(--hr-gradient-hero); animation: rac-busy 1s ease-in-out infinite; }
@keyframes rac-busy { 0% { left: -40%; } 100% { left: 100%; } }

/* verdict overlay */
.rac-verdict { position: absolute; inset: 0; z-index: 9; display: grid; place-items: center; pointer-events: none;
  background: var(--rmb-glass); backdrop-filter: blur(3px) saturate(130%); }
.rac-wash { position: absolute; inset: 0; opacity: 0.85;
  background: radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--vc) 30%, transparent), transparent 65%);
  animation: rac-wash 0.6s var(--rmb-ease) both; }
.rac-verdict[data-d="approve"] { --vc: var(--rmb-st-approved); }
.rac-verdict[data-d="reject"] { --vc: var(--rmb-st-rejected); }
.rac-verdict[data-d="return"] { --vc: var(--rmb-st-returned); }
@keyframes rac-wash { 0% { transform: scale(0.2); opacity: 0; } 60% { opacity: 0.9; } 100% { transform: scale(1.5); opacity: 0.4; } }
.rac-stamp { display: inline-flex; align-items: center; gap: 8px; padding: 9px 18px; border-radius: 10px;
  font-family: var(--rmb-mono); font-weight: 800; font-size: 16px; letter-spacing: 0.14em;
  color: var(--vc); border: 2.4px solid currentColor; background: color-mix(in srgb, var(--vc) 14%, transparent); }
.rac-burst { position: absolute; inset: 0; display: grid; place-items: center; }
.rac-burst i { position: absolute; width: 6px; height: 6px; border-radius: 2px; background: var(--vc);
  animation: rac-burst 0.8s var(--rmb-ease) both; }
@keyframes rac-burst { 0% { transform: translate(0,0) scale(0.4); opacity: 0; } 22% { opacity: 1; } 100% { transform: translate(var(--bx), var(--by)) scale(0.5) rotate(160deg); opacity: 0; } }
.rac-vfade-enter-active { transition: opacity 0.2s; }
.rac-vfade-leave-active { transition: opacity 0.3s; }
.rac-vfade-enter-from, .rac-vfade-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .rac-print, .rac:hover .rac-sheen, .rac-busy i, .rac-wash, .rac-burst i { animation: none !important; }
}
</style>
