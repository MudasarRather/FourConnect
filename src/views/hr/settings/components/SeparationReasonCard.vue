<template>
  <div class="src-shell" :style="{ '--i': index }">
    <div ref="cardEl" class="src" :class="{ off: !active, sys: reason.is_system }" :data-tone="tone">
      <span class="src-glare" aria-hidden="true" />
      <span class="src-spine" :data-nat="nat" aria-hidden="true" />
      <span v-if="!active" class="src-void" aria-hidden="true">VOID</span>

      <!-- main pass body -->
      <div class="src-body">
        <header class="src-head">
          <span class="src-gate" :data-vocab="reason.category">
            <span class="src-gate-k">{{ gate }}</span>
            <span class="src-gate-l">{{ vocabLabel }}</span>
          </span>
          <span class="src-stamp" :data-tone="tone"><i class="src-led" />{{ active ? 'Boarding' : 'Void' }}</span>
        </header>

        <div class="src-id">
          <b class="src-label">{{ reason.label || reason.code }}</b>
          <span class="src-code set-mono"><Hash :size="10" />{{ reason.code }}</span>
        </div>

        <div class="src-tags">
          <span class="src-nat" :data-nat="nat"><component :is="natIcon" :size="11" /> {{ natLabel }}</span>
          <span v-if="reason.is_system" class="src-chip sys"><Lock :size="10" /> Built-in</span>
          <span v-else class="src-chip"><Sparkles :size="10" /> Custom</span>
        </div>

        <p class="src-desc">{{ reason.description || defaultDesc }}</p>

        <!-- actions -->
        <div class="src-actions">
          <button class="src-toggle" :class="{ on: active }" type="button" @click.stop="$emit('toggle', reason)"
            :title="active ? 'Active — offered in Exit' : 'Inactive — hidden from Exit'">
            <span class="src-toggle-knob" /><span class="src-toggle-lab">{{ active ? 'Active' : 'Inactive' }}</span>
          </button>
          <span class="src-spring" />
          <Motion as="button" type="button" class="src-act" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.94 }"
            @click.stop="$emit('edit', reason)" title="Edit"><Pencil :size="14" /></Motion>
          <Motion as="button" type="button" class="src-act danger" :class="{ locked: reason.is_system }"
            :whileHover="reason.is_system ? {} : { y: -2 }" :whileTap="reason.is_system ? {} : { scale: 0.94 }"
            @click.stop="$emit('delete', reason)" :title="reason.is_system ? 'Built-in — deactivate instead' : 'Remove'">
            <component :is="reason.is_system ? Lock : Trash2" :size="14" />
          </Motion>
        </div>
      </div>

      <!-- perforated stub -->
      <div class="src-stub" :data-tone="tone">
        <span class="src-perf" aria-hidden="true" />
        <span class="src-stub-eyebrow">Cited by</span>
        <b class="src-stub-num">{{ cited }}</b>
        <span class="src-stub-unit">exit{{ cited === 1 ? '' : 's' }}</span>
        <span class="src-barcode" aria-hidden="true" />
        <span class="src-stub-tag set-mono">{{ gate }}-{{ shortCode }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Hash, Lock, Sparkles, Pencil, Trash2, ArrowUpRight, ShieldX, Minus } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  reason: { type: Object, required: true },
  index: { type: Number, default: 0 },
  cited: { type: Number, default: 0 },
})
defineEmits(['edit', 'delete', 'toggle'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const active = computed(() => props.reason.is_active !== false)
const vol = computed(() => props.reason.is_voluntary === true)
const invol = computed(() => props.reason.is_voluntary === false)
const nat = computed(() => (vol.value ? 'vol' : invol.value ? 'invol' : 'neutral'))
const natLabel = computed(() => (vol.value ? 'Voluntary' : invol.value ? 'Involuntary' : 'Unspecified'))
const natIcon = computed(() => (vol.value ? ArrowUpRight : invol.value ? ShieldX : Minus))
const tone = computed(() => (!active.value ? 'off' : invol.value ? 'divert' : 'board'))
const gate = computed(() => (props.reason.category === 'RESIGNATION_TYPE' ? 'R' : 'E'))
const vocabLabel = computed(() => (props.reason.category === 'RESIGNATION_TYPE' ? 'Resignation type' : 'Exit reason'))
const shortCode = computed(() => String(props.reason.code || '').slice(0, 4))
const defaultDesc = computed(() => (props.reason.category === 'RESIGNATION_TYPE'
  ? 'A way an engagement formally ends — selectable when initiating a separation.'
  : 'A reason cited in exit cases and exit interviews.'))
</script>

<style scoped>
.src-shell { animation: set-deal 0.55s var(--set-spring) both; animation-delay: calc(var(--i) * 0.05s); }

.src { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) 92px; overflow: hidden;
  border-radius: 16px; background: var(--set-surface-elevated); border: 1px solid var(--set-border);
  box-shadow: var(--set-card-shadow); transition: transform 0.3s var(--set-spring), box-shadow 0.3s, border-color 0.3s;
  transform: perspective(1100px) rotateX(0) rotateY(0); }
.src:hover { box-shadow: var(--set-card-shadow-hover); border-color: var(--set-border-warm);
  transform: perspective(1100px) rotateX(calc((var(--my,0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx,0.5) - 0.5) * 7deg)) translateY(-3px); }
.src.off { opacity: 0.72; }
.src-glare { position: absolute; inset: 0; z-index: 4; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(420px circle at calc(var(--mx,0.5) * 100%) calc(var(--my,0.5) * 100%), rgba(251,191,36,0.16), transparent 60%); }
.src-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; z-index: 3; background: var(--set-unset); }
.src-spine[data-nat="vol"] { background: linear-gradient(180deg, #fbbf24, #fb923c); box-shadow: 0 0 14px -2px rgba(251,191,36,0.7); }
.src-spine[data-nat="invol"] { background: linear-gradient(180deg, #f87171, #dc2626); box-shadow: 0 0 14px -2px rgba(248,113,113,0.6); }

.src-void { position: absolute; top: 50%; left: 32%; z-index: 3; transform: translate(-50%, -50%) rotate(-18deg);
  font-size: 40px; font-weight: 900; letter-spacing: 0.1em; color: color-mix(in srgb, var(--set-conflict) 28%, transparent);
  border: 4px solid color-mix(in srgb, var(--set-conflict) 28%, transparent); border-radius: 10px; padding: 2px 14px;
  pointer-events: none; text-transform: uppercase; }

/* body */
.src-body { position: relative; z-index: 2; padding: 15px 16px 13px 18px; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.src-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.src-gate { display: inline-flex; align-items: center; gap: 7px; }
.src-gate-k { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; font-family: var(--set-mono);
  font-size: 13px; font-weight: 900; color: #1a1206; background: var(--set-grad-hero); box-shadow: 0 4px 10px -4px rgba(251,146,60,0.6); }
.src-gate[data-vocab="EXIT_REASON"] .src-gate-k { background: linear-gradient(135deg, #34d399, #059669); color: #04130d; box-shadow: 0 4px 10px -4px rgba(52,211,153,0.5); }
.src-gate-l { font-size: 9px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.src-stamp { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 999px; flex-shrink: 0;
  font-size: 9px; font-weight: 850; letter-spacing: 0.08em; text-transform: uppercase; }
.src-led { width: 6px; height: 6px; border-radius: 50%; }
.src-stamp[data-tone="board"] { color: var(--set-gold); background: var(--set-partial-soft); }
.src-stamp[data-tone="board"] .src-led { background: var(--set-gold); box-shadow: 0 0 8px var(--set-gold); animation: src-blink 2s ease-in-out infinite; }
.src-stamp[data-tone="divert"] { color: var(--set-conflict); background: var(--set-conflict-soft); }
.src-stamp[data-tone="divert"] .src-led { background: var(--set-conflict); box-shadow: 0 0 8px var(--set-conflict); }
.src-stamp[data-tone="off"] { color: var(--set-text-dim); background: var(--set-unset-soft); }
.src-stamp[data-tone="off"] .src-led { background: var(--set-unset); }
@keyframes src-blink { 0%,100% { opacity: 0.45; } 50% { opacity: 1; } }

.src-id { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.src-label { font-size: 17px; font-weight: 850; letter-spacing: -0.01em; color: var(--set-text); line-height: 1.1;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.src-code { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--set-text-muted); }
.src-code :deep(svg) { color: var(--set-text-dim); }

.src-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.src-nat { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 10.5px; font-weight: 700;
  color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); }
.src-nat[data-nat="vol"] { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 30%, transparent); }
.src-nat[data-nat="invol"] { color: var(--set-conflict); background: var(--set-conflict-soft); border-color: color-mix(in srgb, var(--set-conflict) 30%, transparent); }
.src-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 10.5px; font-weight: 700;
  color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); }
.src-chip.sys { color: var(--set-gold); background: var(--set-partial-soft); border-color: color-mix(in srgb, var(--set-gold) 28%, transparent); }

.src-desc { margin: 0; font-size: 11.5px; line-height: 1.45; color: var(--set-text-muted);
  display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.src-actions { display: flex; align-items: center; gap: 8px; margin-top: 2px; padding-top: 11px; border-top: 1px solid var(--set-border); }
.src-toggle { display: inline-flex; align-items: center; gap: 8px; padding: 4px 11px 4px 5px; border-radius: 999px; cursor: pointer; font: inherit;
  background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.src-toggle-knob { position: relative; width: 28px; height: 16px; border-radius: 999px; background: var(--set-unset-soft); transition: background 0.25s; flex-shrink: 0; }
.src-toggle-knob::after { content: ''; position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; border-radius: 50%; background: var(--set-unset); transition: transform 0.25s var(--set-spring), background 0.25s; }
.src-toggle.on .src-toggle-knob { background: var(--set-ok-soft); }
.src-toggle.on .src-toggle-knob::after { transform: translateX(12px); background: var(--set-ok); }
.src-toggle-lab { font-size: 10.5px; font-weight: 750; color: var(--set-text-muted); }
.src-toggle.on .src-toggle-lab { color: var(--set-ok); }
.src-spring { flex: 1; }
.src-act { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; cursor: pointer;
  color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); transition: color 0.2s, border-color 0.2s, background 0.2s; }
.src-act:hover { color: var(--set-gold); border-color: var(--set-border-warm); }
.src-act.danger:hover { color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 36%, transparent); background: var(--set-conflict-soft); }
.src-act.locked { opacity: 0.55; cursor: not-allowed; }
.src-act.locked:hover { color: var(--set-text-muted); border-color: var(--set-border); background: var(--set-surface); }

/* perforated stub */
.src-stub { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  padding: 14px 8px; background: var(--set-panel); border-left: 2px dashed var(--set-border-strong); }
.src-perf { position: absolute; left: -7px; top: 0; bottom: 0; width: 12px; pointer-events: none;
  background:
    radial-gradient(circle 7px at 0 -2px, transparent 6px, var(--set-surface-elevated) 6.5px) top left / 12px 14px repeat-y; }
.src-stub::before, .src-stub::after { content: ''; position: absolute; left: -8px; width: 14px; height: 14px; border-radius: 50%;
  background: var(--set-canvas); border: 1px solid var(--set-border); }
.src-stub::before { top: -8px; } .src-stub::after { bottom: -8px; }
.src-stub-eyebrow { font-size: 7.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.src-stub-num { font-family: var(--set-mono); font-size: 24px; font-weight: 850; line-height: 1; color: var(--set-gold); }
.src-stub[data-tone="divert"] .src-stub-num { color: var(--set-conflict); }
.src-stub[data-tone="off"] .src-stub-num { color: var(--set-text-dim); }
.src-stub-unit { font-size: 8px; color: var(--set-text-muted); }
.src-barcode { width: 100%; height: 26px; margin: 7px 0 5px; border-radius: 3px; opacity: 0.7;
  background: repeating-linear-gradient(90deg, var(--set-text) 0 1px, transparent 1px 2px, var(--set-text) 2px 4px, transparent 4px 7px, var(--set-text) 7px 8px, transparent 8px 11px); }
.src-stub-tag { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; color: var(--set-text-muted); }

@media (prefers-reduced-motion: reduce) {
  .src-shell { animation: none; }
  .src:hover { transform: translateY(-2px); }
  .src-stamp[data-tone="board"] .src-led { animation: none; }
}
</style>
