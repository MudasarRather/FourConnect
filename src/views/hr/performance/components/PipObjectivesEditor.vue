<template>
  <!-- Shared objectives builder for the PIP modal (create + manage). Rows bind directly
       to the passed reactive objective objects; add/remove/status are emitted to the parent. -->
  <div class="oe">
    <div class="oe-list">
      <Presence>
        <Motion v-for="(o, i) in objectives" :key="o._k" as="div" class="oe-obj"
          :initial="reduced ? false : { opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
          :exit="{ opacity: 0, height: 0, marginBottom: 0 }" :transition="{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }">
          <div class="oe-grid">
            <span class="oe-idx">{{ i + 1 }}</span>
            <input v-model="o.title" class="oe-in" placeholder="Objective" />
            <input v-model="o.measure" class="oe-in" placeholder="Measure / how we'll track it" />
            <input v-model="o.target" class="oe-in" placeholder="Target" />
            <button class="oe-rm" type="button" title="Remove" @click="$emit('remove', i)"><Trash2 :size="13" /></button>
          </div>
          <div v-if="manage" class="oe-stat">
            <button v-for="s in OBJ_STATES" :key="s.key" type="button" class="oe-pill" :class="{ on: o.status === s.key }"
              :style="{ '--c': s.color }" :disabled="objSaving" @click="$emit('set-status', i, s.key)">
              <component :is="s.icon" :size="11" />{{ s.label }}
            </button>
          </div>
        </Motion>
      </Presence>
    </div>
    <button class="oe-add" type="button" @click="$emit('add')"><Plus :size="13" /> Add objective</button>
  </div>
</template>

<script setup>
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { Plus, Trash2, CircleDot, CheckCircle2, MinusCircle } from 'lucide-vue-next'
import { prefersReduced } from '@/composables/useShiftMotion'

defineProps({
  objectives: { type: Array, default: () => [] },
  manage: { type: Boolean, default: false },
  objSaving: { type: Boolean, default: false },
})
defineEmits(['add', 'remove', 'set-status'])
const reduced = prefersReduced()

const OBJ_STATES = [
  { key: 'OPEN', label: 'Open', color: 'var(--perf-amber)', icon: CircleDot },
  { key: 'MET', label: 'Met', color: 'var(--perf-ok)', icon: CheckCircle2 },
  { key: 'MISSED', label: 'Missed', color: 'var(--perf-conflict)', icon: MinusCircle },
]
</script>

<style scoped>
.oe { display: flex; flex-direction: column; gap: 8px; }
.oe-list { display: flex; flex-direction: column; gap: 8px; }
.oe-obj { overflow: hidden; padding: 10px; border-radius: 12px; background: var(--perf-panel); border: 1px solid var(--perf-border); display: flex; flex-direction: column; gap: 8px; }
.oe-grid { display: grid; grid-template-columns: 22px 1.4fr 1.4fr 1fr 30px; gap: 7px; align-items: center; }
.oe-idx { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; font-size: 10px; font-weight: 850; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 14%, transparent); }
.oe-in { width: 100%; height: 36px; padding: 0 10px; border-radius: 9px; font: inherit; font-size: 12px; color: var(--hr-input-text, var(--perf-text)); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.oe-in:focus { outline: none; border-color: var(--perf-border-warm); }
.oe-rm { display: grid; place-items: center; width: 30px; height: 36px; border-radius: 9px; cursor: pointer; color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); transition: all 0.18s; }
.oe-rm:hover { color: var(--perf-conflict); border-color: color-mix(in srgb, var(--perf-conflict) 30%, transparent); background: color-mix(in srgb, var(--perf-conflict) 10%, transparent); }
.oe-stat { display: flex; gap: 6px; padding-left: 29px; }
.oe-pill { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 10.5px; font-weight: 700;
  --c: var(--perf-unset); color: var(--perf-text-muted); background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.18s; }
.oe-pill:disabled { opacity: 0.6; cursor: progress; }
.oe-pill.on { color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border-color: color-mix(in srgb, var(--c) 36%, transparent); }
.oe-pill.on :deep(svg) { color: var(--c); }
.oe-add { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; padding: 8px 13px; border-radius: 11px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 700;
  color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 8%, transparent); border: 1px dashed color-mix(in srgb, var(--perf-gold) 34%, transparent); transition: all 0.2s; }
.oe-add:hover { background: color-mix(in srgb, var(--perf-gold) 15%, transparent); }

@media (max-width: 720px) {
  .oe-grid { grid-template-columns: 22px 1fr 30px; }
  .oe-grid .oe-in:nth-child(3), .oe-grid .oe-in:nth-child(4) { grid-column: 2 / 3; }
}
</style>
