<template>
  <div class="vs" :class="{ readonly, interactive: !readonly }" :style="{ '--sz': size + 'px' }"
    @mouseleave="hover = 0" role="radiogroup" :aria-label="`Rating ${modelValue || 0} of 5`">
    <button v-for="n in 5" :key="n" type="button" class="vs-star" :class="{ lit: n <= shown, peek: !readonly && hover >= n }"
      :disabled="readonly" :tabindex="readonly ? -1 : 0" :style="{ '--n': n }"
      @mouseenter="!readonly && (hover = n)" @click="!readonly && pick(n)" :aria-checked="modelValue === n" role="radio">
      <Star :size="size" :fill="n <= shown ? 'currentColor' : 'none'" />
    </button>
    <span v-if="showValue" class="vs-val">{{ modelValue ? Number(modelValue).toFixed(1) : '—' }}</span>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Star } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: [Number, null], default: null },
  readonly: { type: Boolean, default: false },
  size: { type: Number, default: 16 },
  showValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const hover = ref(0)
const shown = computed(() => (!props.readonly && hover.value) ? hover.value : (props.modelValue || 0))
// click the active star again to clear
function pick(n) { emit('update:modelValue', props.modelValue === n ? null : n) }
</script>

<style scoped>
.vs { display: inline-flex; align-items: center; gap: 3px; }
.vs-star { display: grid; place-items: center; padding: 1px; border: none; background: none; cursor: pointer; color: var(--as-steel-dim);
  transition: color 0.2s var(--as-spring), transform 0.2s var(--as-spring); transform-origin: center bottom; }
.vs.readonly .vs-star { cursor: default; padding: 0; }
.vs-star.lit { color: var(--as-amber); filter: drop-shadow(0 0 4px color-mix(in srgb, var(--as-amber) 55%, transparent)); }
.vs.interactive .vs-star:hover { transform: scale(1.22) translateY(-1px); }
.vs.interactive .vs-star.peek { color: var(--as-amber-bright); }
.vs.interactive .vs-star.lit { animation: vs-pop 0.34s var(--as-spring) calc(var(--n) * 0.03s) both; }
.vs-val { margin-left: 5px; font-size: 12px; font-weight: 800; color: var(--as-amber); font-variant-numeric: tabular-nums; }

@keyframes vs-pop { 0% { transform: scale(0.5) rotate(-18deg); opacity: 0; } 60% { transform: scale(1.2) rotate(4deg); } 100% { transform: scale(1) rotate(0); opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .vs-star { transition: color 0.2s; } .vs-star.lit { animation: none; } .vs.interactive .vs-star:hover { transform: none; } }
</style>
