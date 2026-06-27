<template>
  <div class="prc-shell" :style="{ '--i': index }">
    <div ref="card" class="prc" :class="{ configured, dimmed }">
      <span class="prc-glare" aria-hidden="true" />
      <span class="prc-spine" aria-hidden="true" />

      <header class="prc-head">
        <span class="prc-ic"><component :is="icon" :size="15" /></span>
        <div class="prc-titles">
          <b class="prc-label">{{ rule.label }}</b>
          <span class="prc-key set-mono">{{ rule.key }}</span>
        </div>
        <span class="prc-state" :data-on="configured">
          <i class="prc-led" /><span>{{ configured ? 'Set' : 'Default' }}</span>
        </span>
      </header>

      <!-- control -->
      <div class="prc-ctl">
        <div v-if="rule.type === 'select'" class="prc-chips">
          <button v-for="o in rule.options" :key="o" type="button" class="prc-chip" :class="{ on: String(value) === String(o) }"
            @click="$emit('set', o)">{{ pretty(o) }}</button>
        </div>
        <div v-else class="prc-stepper">
          <button type="button" class="prc-step" :disabled="num <= min" @click="bump(-1)" aria-label="decrease"><Minus :size="14" /></button>
          <div class="prc-num-wrap">
            <input class="prc-num set-mono" :value="value" inputmode="decimal" @change="onType($event.target.value)" />
            <span v-if="unit" class="prc-unit">{{ unit }}</span>
          </div>
          <button type="button" class="prc-step" :disabled="max != null && num >= max" @click="bump(1)" aria-label="increase"><Plus :size="14" /></button>
        </div>
      </div>

      <!-- footer: engine consumption + actions -->
      <footer class="prc-foot">
        <button type="button" class="prc-feed" :class="{ live: consumed }" @click="$emit('go', consumedBy)" :title="consumed ? 'Read by the engine — open module' : 'Advisory — not yet read by the engine'">
          <span class="prc-feed-led" />
          <component :is="consumed ? Zap : CircleDashed" :size="11" />
          {{ consumed ? 'Live' : 'Advisory' }} · {{ consumedByLabel }}
          <ArrowUpRight :size="10" class="prc-feed-arr" />
        </button>
        <Motion v-if="configured" as="button" type="button" class="prc-reset"
          :whileHover="{ rotate: -35 }" :whileTap="{ scale: 0.9 }" :transition="{ duration: 0.3 }"
          title="Reset to default" @click="$emit('reset')"><RotateCcw :size="13" /></Motion>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { RotateCcw, Plus, Minus, Zap, CircleDashed, ArrowUpRight } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import { MODULES } from './connectivity'

const props = defineProps({
  rule: { type: Object, required: true },          // {key,label,type,options,group}
  value: { type: [String, Number], default: '' },
  configured: { type: Boolean, default: false },
  icon: { type: [Object, Function], default: null },
  step: { type: Number, default: 1 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: null },
  unit: { type: String, default: '' },
  consumed: { type: Boolean, default: false },     // engine actually reads it
  consumedBy: { type: String, default: 'payroll' },// module key for cross-link
  index: { type: Number, default: 0 },
  dimmed: { type: Boolean, default: false },
})
const emit = defineEmits(['set', 'reset', 'go'])

const card = ref(null)
usePointerSpotlight(card)   // sets --mx/--my on the card element

const num = computed(() => Number(props.value) || 0)
const pretty = (o) => String(o).split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
const consumedByLabel = computed(() => MODULES[props.consumedBy]?.label || 'Payroll')

const round = (v) => Math.round(v * 100) / 100
function bump(dir) {
  let next = round(num.value + dir * props.step)
  if (next < props.min) next = props.min
  if (props.max != null && next > props.max) next = props.max
  emit('set', next)
}
function onType(raw) {
  let v = Number(raw)
  if (Number.isNaN(v)) return
  if (v < props.min) v = props.min
  if (props.max != null && v > props.max) v = props.max
  emit('set', round(v))
}
</script>

<style scoped>
.prc-shell { animation: set-deal 0.5s var(--set-spring) backwards; animation-delay: calc(var(--i, 0) * 0.05s); }
.prc {
  position: relative; overflow: hidden; height: 100%; display: flex; flex-direction: column; gap: 12px;
  padding: 15px 16px 13px; border-radius: 16px;
  background: var(--set-surface); border: 1px solid var(--set-border);
  box-shadow: var(--set-card-shadow);
  transition: transform 0.3s var(--set-spring), border-color 0.3s, box-shadow 0.3s, opacity 0.3s;
  transform: perspective(1100px)
    rotateX(calc((var(--my, 0.5) - 0.5) * -5deg))
    rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg));
}
.prc:hover { border-color: var(--set-border-warm); box-shadow: var(--set-card-shadow-hover); transform: perspective(1100px)
    rotateX(calc((var(--my, 0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg)) translateY(-2px); }
.prc.dimmed { opacity: 0.5; }
.prc-glare { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.3s; border-radius: inherit;
  background: radial-gradient(380px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--set-amber) 16%, transparent), transparent 60%); }
.prc:hover .prc-glare { opacity: 1; }
.prc-spine { position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 0 3px 3px 0;
  background: var(--set-unset); transition: background 0.3s; }
.prc.configured .prc-spine { background: linear-gradient(180deg, var(--set-amber), var(--set-deep)); box-shadow: 0 0 10px color-mix(in srgb, var(--set-amber) 50%, transparent); }

.prc-head { position: relative; display: flex; align-items: center; gap: 10px; }
.prc-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  color: var(--set-amber); background: color-mix(in srgb, var(--set-amber) 12%, transparent); border: 1px solid color-mix(in srgb, var(--set-amber) 26%, transparent); }
.prc-titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.prc-label { font-size: 13px; font-weight: 750; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prc-key { font-size: 9px; color: var(--set-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prc-state { display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; font-size: 9px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--set-text-dim); }
.prc-state[data-on="true"] { color: var(--set-amber); }
.prc-led { width: 6px; height: 6px; border-radius: 50%; background: var(--set-unset); }
.prc-state[data-on="true"] .prc-led { background: var(--set-amber); box-shadow: 0 0 8px var(--set-amber); animation: set-led-pulse 2.4s ease-in-out infinite; }

.prc-ctl { position: relative; }
.prc-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.prc-chip { padding: 7px 12px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 650;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border);
  transition: all 0.18s var(--set-spring); }
.prc-chip:hover { color: var(--set-text); border-color: var(--set-border-strong); transform: translateY(-1px); }
.prc-chip.on { color: var(--set-amber); background: color-mix(in srgb, var(--set-amber) 14%, transparent);
  border-color: color-mix(in srgb, var(--set-amber) 38%, transparent); box-shadow: 0 4px 14px -8px color-mix(in srgb, var(--set-amber) 70%, transparent); }

.prc-stepper { display: inline-flex; align-items: center; gap: 8px; }
.prc-step { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; cursor: pointer; flex-shrink: 0;
  color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.18s var(--set-spring); }
.prc-step:hover:not(:disabled) { color: var(--set-amber); border-color: color-mix(in srgb, var(--set-amber) 40%, transparent); transform: translateY(-1px); }
.prc-step:disabled { opacity: 0.4; cursor: not-allowed; }
.prc-num-wrap { position: relative; display: inline-flex; align-items: center; }
.prc-num { width: 84px; padding: 7px 10px; border-radius: 10px; font: inherit; font-size: 14px; font-weight: 700; text-align: center;
  color: var(--set-text); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.prc-num:focus { outline: none; border-color: var(--set-amber); }
.prc-unit { position: absolute; right: 10px; font-size: 10px; color: var(--set-text-dim); pointer-events: none; }

.prc-foot { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; }
.prc-feed { display: inline-flex; align-items: center; gap: 5px; padding: 5px 9px; border-radius: 999px; cursor: pointer;
  font: inherit; font-size: 10px; font-weight: 700; color: var(--set-text-muted);
  background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s; }
.prc-feed:hover { color: var(--set-text); border-color: var(--set-border-strong); }
.prc-feed-led { width: 5px; height: 5px; border-radius: 50%; background: var(--set-unset); }
.prc-feed.live { color: var(--set-ok); border-color: color-mix(in srgb, var(--set-ok) 30%, transparent); background: var(--set-ok-soft); }
.prc-feed.live .prc-feed-led { background: var(--set-ok); box-shadow: 0 0 7px var(--set-ok); }
.prc-feed-arr { opacity: 0.6; }
.prc-reset { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer; flex-shrink: 0;
  color: var(--set-text-dim); background: transparent; border: 1px solid var(--set-border); }
.prc-reset:hover { color: var(--set-amber); border-color: color-mix(in srgb, var(--set-amber) 38%, transparent); }

@media (prefers-reduced-motion: reduce) {
  .prc-shell { animation: none; }
  .prc, .prc:hover { transform: none; }
  .prc-state[data-on="true"] .prc-led { animation: none; }
}
</style>
