<template>
  <span class="rod" :style="{ color: color }" :aria-label="display">
    <span v-for="(ch, i) in chars" :key="i" class="rod-ch" :class="{ sep: ch.sep }">
      <template v-if="ch.sep">{{ ch.v }}</template>
      <span v-else class="rod-reel" :style="{ transform: `translateY(${-ch.v}em)` }">
        <span v-for="d in 10" :key="d" class="rod-d">{{ d - 1 }}</span>
      </span>
    </span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  color: { type: String, default: 'inherit' },
  prefix: { type: String, default: '₹' },
})
const display = computed(() => props.prefix + Math.round(Number(props.value) || 0).toLocaleString('en-IN'))
const chars = computed(() => display.value.split('').map((c) => (
  /\d/.test(c) ? { sep: false, v: Number(c) } : { sep: true, v: c }
)))
</script>

<style scoped>
.rod { display: inline-flex; align-items: baseline; font-family: var(--ex-mono); font-variant-numeric: tabular-nums; line-height: 1; }
.rod-ch { display: inline-block; height: 1em; line-height: 1em; overflow: hidden; vertical-align: top; }
.rod-ch.sep { overflow: visible; padding: 0 0.02em; }
.rod-reel { display: flex; flex-direction: column; will-change: transform; transition: transform 0.85s cubic-bezier(0.16, 1, 0.3, 1); }
.rod-d { height: 1em; line-height: 1em; text-align: center; }
@media (prefers-reduced-motion: reduce) { .rod-reel { transition: none; } }
</style>
