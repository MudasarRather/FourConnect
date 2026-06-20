<template>
  <span class="acm" :title="`Condition: ${meta.label}`" :aria-label="`Condition ${meta.label}`">
    <span v-for="n in 4" :key="n" class="seg" :class="{ on: n <= meta.level }" :style="segStyle(n)" />
    <span v-if="showLabel" class="acm-label">{{ meta.label }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { conditionMeta } from '@/composables/useAssets'

const props = defineProps({
  value: { type: String, default: 'GOOD' },
  showLabel: { type: Boolean, default: false },
})
const meta = computed(() => conditionMeta(props.value))
const COLORS = ['var(--as-cond-poor)', 'var(--as-cond-fair)', 'var(--as-cond-good)', 'var(--as-cond-new)']
const segStyle = (n) => ({ '--seg': COLORS[n - 1] })
</script>

<style scoped>
.acm { display: inline-flex; align-items: center; gap: 3px; }
.seg {
  width: 14px; height: 5px; border-radius: 3px; background: var(--as-st-retired-soft);
  transition: background 0.4s var(--as-spring), box-shadow 0.4s var(--as-spring);
}
.seg.on { background: var(--seg); box-shadow: 0 0 6px color-mix(in srgb, var(--seg) 60%, transparent); }
.acm-label { margin-left: 6px; font-size: 11px; font-weight: 600; color: var(--as-text-muted); }
</style>
