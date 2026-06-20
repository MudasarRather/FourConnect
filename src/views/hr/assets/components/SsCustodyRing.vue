<template>
  <div class="cr" ref="root">
    <span v-if="!reduced" class="cr-ticks" aria-hidden="true" />
    <svg class="cr-svg" viewBox="0 0 120 120" role="img" :aria-label="`${acked} of ${held} acknowledged`">
      <circle class="cr-track" cx="60" cy="60" r="50" stroke-width="9" pathLength="100" />
      <circle class="cr-fill" :class="{ pending }" cx="60" cy="60" r="50" stroke-width="9" pathLength="100"
        transform="rotate(-90 60 60)" :style="{ '--p': draw ? pct : 0 }" />
    </svg>
    <div class="cr-core">
      <b class="cr-num"><AssetCountUp :value="held" :start="draw" :duration="1.3" /></b>
      <span class="cr-lab">in hand</span>
      <span class="cr-sub" :data-pending="pending">
        <component :is="pending ? Clock : CheckCheck" :size="11" />
        {{ pending ? `${pendingAck} to sign` : (held ? 'all signed' : 'locker empty') }}
      </span>
    </div>
    <span class="cr-glow" :class="{ pending }" aria-hidden="true" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { CheckCheck, Clock } from 'lucide-vue-next'
import AssetCountUp from './AssetCountUp.vue'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  held: { type: Number, default: 0 },
  acked: { type: Number, default: 0 },
  pendingAck: { type: Number, default: 0 },
})
const root = ref(null)
const reduced = prefersReduced()
const draw = ref(false)
onMounted(() => { nextTick(() => requestAnimationFrame(() => { draw.value = true })) })

const pending = computed(() => props.pendingAck > 0)
const pct = computed(() => props.held ? Math.round((props.acked / props.held) * 100) : 0)
</script>

<style scoped>
@property --p { syntax: '<number>'; inherits: false; initial-value: 0; }

.cr { position: relative; width: 188px; height: 188px; flex-shrink: 0; display: grid; place-items: center; }
.cr-ticks { position: absolute; inset: -2px; border-radius: 50%; pointer-events: none;
  background: repeating-conic-gradient(from 0deg, var(--as-border-strong) 0 0.6deg, transparent 0.6deg 12deg);
  -webkit-mask: radial-gradient(closest-side, transparent 92%, #000 93%); mask: radial-gradient(closest-side, transparent 92%, #000 93%);
  opacity: 0.5; animation: as-spin 80s linear infinite; }
.cr-svg { position: absolute; inset: 8px; width: calc(100% - 16px); height: calc(100% - 16px); }
.cr-track { fill: none; stroke: var(--as-border-soft); }
.cr-fill { fill: none; stroke: var(--as-st-available); stroke-linecap: round; stroke-dasharray: var(--p) 100;
  transition: stroke-dasharray 1.4s var(--as-spring); filter: drop-shadow(0 0 5px color-mix(in srgb, var(--as-st-available) 55%, transparent)); }
.cr-fill.pending { stroke: var(--as-st-allocated); filter: drop-shadow(0 0 5px color-mix(in srgb, var(--as-st-allocated) 55%, transparent)); }

.cr-core { position: relative; display: flex; flex-direction: column; align-items: center; gap: 1px; text-align: center; z-index: 1; }
.cr-num { font-size: 44px; font-weight: 850; line-height: 1; color: var(--as-text); letter-spacing: -0.03em; }
.cr-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-muted); margin-top: 2px; }
.cr-sub { display: inline-flex; align-items: center; gap: 4px; margin-top: 7px; font-size: 11px; font-weight: 700; color: var(--as-st-available);
  padding: 3px 9px; border-radius: 999px; background: color-mix(in srgb, var(--as-st-available) 12%, transparent); border: 1px solid color-mix(in srgb, var(--as-st-available) 26%, transparent); }
.cr-sub[data-pending="true"] { color: var(--as-st-allocated); background: color-mix(in srgb, var(--as-st-allocated) 12%, transparent); border-color: color-mix(in srgb, var(--as-st-allocated) 28%, transparent); }

.cr-glow { position: absolute; inset: 22px; border-radius: 50%; pointer-events: none; z-index: 0;
  background: radial-gradient(circle, color-mix(in srgb, var(--as-st-available) 16%, transparent), transparent 70%); animation: cr-breathe 3.6s ease-in-out infinite; }
.cr-glow.pending { background: radial-gradient(circle, color-mix(in srgb, var(--as-st-allocated) 18%, transparent), transparent 70%); }

@keyframes cr-breathe { 0%, 100% { opacity: 0.45; transform: scale(1); } 50% { opacity: 0.85; transform: scale(1.08); } }
@media (prefers-reduced-motion: reduce) { .cr-ticks, .cr-glow { animation: none; } .cr-fill { transition: none; } }
</style>
