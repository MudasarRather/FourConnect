<template>
  <div class="np-shell" :style="{ '--i': index }">
    <div class="np" ref="cardEl" :class="state" :style="{ '--acc': accent }">
      <span class="np-glare" aria-hidden="true" />
      <span class="np-spine" aria-hidden="true" />

      <!-- head -->
      <header class="np-head">
        <span class="np-ic"><component :is="down.icon || Hash" :size="15" /></span>
        <div class="np-id">
          <b>{{ mod.label }}</b>
          <span class="np-mod set-mono">{{ mod.module }}</span>
        </div>
        <span class="np-state" :data-state="stateLabel.tone">{{ stateLabel.text }}</span>
      </header>

      <!-- next-id readout plate -->
      <div class="np-readout">
        <span class="np-readout-rivet tl" /><span class="np-readout-rivet tr" />
        <span class="np-readout-rivet bl" /><span class="np-readout-rivet br" />
        <span class="np-readout-lab">{{ series ? 'Next identifier' : 'Built-in auto-ID' }}</span>
        <b class="np-readout-val set-mono" :key="preview">{{ preview }}</b>
      </div>

      <!-- token anatomy strip -->
      <div class="np-tokens">
        <span v-for="t in tokens" :key="t.key" class="np-tok" :class="{ on: t.on }" :title="t.value">
          {{ t.label }}
        </span>
      </div>

      <!-- meta -->
      <div v-if="series" class="np-meta">
        <span class="np-chip"><Hash :size="10" /> counter {{ series.current_number }}</span>
        <span class="np-chip"><Ruler :size="10" /> width {{ series.padding }}</span>
        <span v-if="series.financial_year_reset" class="np-chip warm"><RotateCcw :size="10" /> FY-reset</span>
        <span v-if="series.include_year" class="np-chip warm">+year</span>
        <span v-if="series.include_month" class="np-chip warm">+month</span>
      </div>
      <p v-else class="np-legacy">No series configured — IDs keep using the built-in sequence ({{ mod.sample_prefix }}0001, …).</p>

      <!-- downstream link -->
      <button v-if="down.to" class="np-down" @click="$emit('go', down.to)">
        <Share2 :size="11" /> Powers <b>{{ down.label }}</b><ExternalLink :size="11" />
      </button>

      <!-- actions -->
      <div class="np-actions">
        <template v-if="series">
          <Motion as="button" type="button" class="np-act" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" @click="$emit('edit', mod)">
            <FilePen :size="13" /> Edit
          </Motion>
          <Motion as="button" type="button" class="np-act" title="Continue from the highest ID already in the database"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" @click="$emit('sync', series)">
            <RotateCcw :size="13" /> Sync
          </Motion>
          <Motion as="button" type="button" class="np-act danger" title="Decommission series"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" @click="$emit('delete', series)">
            <Trash2 :size="13" />
          </Motion>
        </template>
        <Motion v-else as="button" type="button" class="set-btn set-btn-primary np-config"
          :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('configure', mod)">
          <Plus :size="14" /> Configure
        </Motion>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Hash, FilePen, RotateCcw, Trash2, Plus, Ruler, Share2, ExternalLink } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import { nextId, builtinSample, tokenAnatomy, downstreamOf } from '../composables/numberingFormat'

const props = defineProps({
  mod: { type: Object, required: true },          // { module, label, sample_prefix }
  series: { type: Object, default: null },        // configured row or null
  index: { type: Number, default: 0 },
})
defineEmits(['edit', 'sync', 'delete', 'configure', 'go'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const down = computed(() => downstreamOf(props.mod.module))
const accent = computed(() => (props.series ? (props.series.is_active ? 'var(--set-ember)' : 'var(--set-unset)') : 'var(--set-unset)'))
const state = computed(() => (props.series ? (props.series.is_active ? 'configured' : 'paused') : 'builtin'))
const stateLabel = computed(() => {
  if (!props.series) return { text: 'Built-in', tone: 'idle' }
  return props.series.is_active ? { text: 'Active', tone: 'on' } : { text: 'Paused', tone: 'off' }
})
const preview = computed(() => (props.series ? nextId(props.series) : builtinSample(props.mod)))
const tokens = computed(() => (props.series ? tokenAnatomy(props.series) : [
  { key: 'prefix', label: 'PRE', on: true },
  { key: 'year', label: 'YYYY', on: false },
  { key: 'month', label: 'MM', on: false },
  { key: 'counter', label: '####', on: true },
  { key: 'suffix', label: 'SUF', on: false },
]))
</script>

<style scoped>
.np-shell { animation: set-deal 0.55s var(--set-spring) both; animation-delay: calc(var(--i) * 0.05s); }
.np { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 11px; padding: 16px;
  border-radius: 16px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow);
  transition: transform 0.3s var(--set-spring), box-shadow 0.3s, border-color 0.3s; transform-style: preserve-3d; }
.np:hover { transform: perspective(1100px) rotateX(calc((var(--my, 0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg)) translateY(-3px);
  box-shadow: var(--set-card-shadow-hover); border-color: color-mix(in srgb, var(--acc) 30%, var(--set-border)); }
.np-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s; z-index: 3;
  background: radial-gradient(360px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--acc) 18%, transparent), transparent 60%); }
.np-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: linear-gradient(180deg, var(--acc), color-mix(in srgb, var(--acc) 20%, transparent)); }
.np.builtin .np-spine, .np.paused .np-spine { opacity: 0.5; }

.np-head { display: flex; align-items: center; gap: 10px; }
.np-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  color: var(--acc); background: color-mix(in srgb, var(--acc) 14%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 28%, transparent); }
.np-id { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 1px; }
.np-id b { font-size: 13.5px; font-weight: 800; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.np-mod { font-size: 9px; color: var(--set-text-dim); }
.np-state { flex-shrink: 0; font-size: 8.5px; font-weight: 850; letter-spacing: 0.06em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px; }
.np-state[data-state="on"] { color: var(--set-ok); background: var(--set-ok-soft); border: 1px solid color-mix(in srgb, var(--set-ok) 26%, transparent); }
.np-state[data-state="off"] { color: var(--set-partial); background: var(--set-partial-soft); border: 1px solid color-mix(in srgb, var(--set-partial) 26%, transparent); }
.np-state[data-state="idle"] { color: var(--set-unset); background: var(--set-unset-soft); border: 1px solid var(--set-border); }

.np-readout { position: relative; display: flex; flex-direction: column; gap: 3px; padding: 13px 14px; border-radius: 12px;
  background: linear-gradient(150deg, color-mix(in srgb, var(--acc) 10%, var(--set-panel)), var(--set-panel));
  border: 1px dashed color-mix(in srgb, var(--acc) 34%, var(--set-border-strong)); }
.np-readout-rivet { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: color-mix(in srgb, var(--acc) 50%, var(--set-text-dim)); opacity: 0.55; }
.np-readout-rivet.tl { top: 6px; left: 6px; } .np-readout-rivet.tr { top: 6px; right: 6px; }
.np-readout-rivet.bl { bottom: 6px; left: 6px; } .np-readout-rivet.br { bottom: 6px; right: 6px; }
.np-readout-lab { font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.np-readout-val { font-size: 19px; font-weight: 850; letter-spacing: 0.06em; word-break: break-all;
  color: var(--acc); animation: np-pop 0.4s var(--set-spring); }
.np.builtin .np-readout-val, .np.paused .np-readout-val { color: var(--set-text-secondary); }
@keyframes np-pop { from { opacity: 0.3; transform: translateY(3px); } to { opacity: 1; transform: none; } }

.np-tokens { display: flex; flex-wrap: wrap; gap: 5px; }
.np-tok { font-family: var(--set-mono); font-size: 9px; font-weight: 700; letter-spacing: 0.04em; padding: 3px 7px; border-radius: 6px;
  color: var(--set-text-dim); background: var(--set-surface-elevated); border: 1px solid var(--set-border); opacity: 0.5; transition: all 0.25s var(--set-spring); }
.np-tok.on { color: var(--acc); opacity: 1; background: color-mix(in srgb, var(--acc) 12%, transparent); border-color: color-mix(in srgb, var(--acc) 30%, transparent); }

.np-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.np-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 700; color: var(--set-text-muted);
  padding: 2px 8px; border-radius: 999px; background: var(--set-surface-elevated); border: 1px solid var(--set-border); }
.np-chip.warm { color: var(--set-ember); border-color: color-mix(in srgb, var(--set-ember) 28%, transparent); }
.np-chip :deep(svg) { color: currentColor; }
.np-legacy { margin: 0; font-size: 11px; line-height: 1.45; color: var(--set-text-dim); }

.np-down { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; padding: 5px 10px; border-radius: 999px; cursor: pointer;
  font: inherit; font-size: 10.5px; font-weight: 600; color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.np-down:hover { color: var(--set-ember); border-color: color-mix(in srgb, var(--set-ember) 40%, transparent); transform: translateY(-1px); }
.np-down b { color: var(--set-text-secondary); } .np-down:hover b { color: var(--set-ember); }
.np-down :deep(svg) { color: var(--set-ember); }

.np-actions { display: flex; gap: 7px; margin-top: auto; }
.np-act { display: inline-flex; align-items: center; gap: 5px; padding: 7px 11px; border-radius: 9px; cursor: pointer; font: inherit;
  font-size: 11.5px; font-weight: 600; color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: color 0.2s, border-color 0.2s; }
.np-act:hover { color: var(--set-text); border-color: var(--set-border-strong); }
.np-act.danger:hover { color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 40%, transparent); }
.np-config { align-self: flex-start; }

@media (prefers-reduced-motion: reduce) {
  .np-shell, .np-readout-val { animation: none; }
  .np:hover { transform: translateY(-2px); }
}
</style>
