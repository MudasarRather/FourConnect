<template>
  <div class="ml">
    <div class="ml-head">
      <span class="ml-eyebrow"><Grip :size="12" /> Configuration deck</span>
      <span class="ml-meta set-mono">{{ tiles.length }} domains</span>
    </div>
    <div class="ml-grid">
      <GovernanceTile v-for="(d, i) in tiles" :key="d.slug" :domain="d" :index="i"
        :state="stateOf(d.slug)" :count="countOf(d.slug)"
        @pick="(s) => $emit('pick', s)" @hover="(s) => $emit('hover', s)" @leave="$emit('leave')" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Grip } from 'lucide-vue-next'
import GovernanceTile from './GovernanceTile.vue'
import { DOMAINS } from './connectivity'

const props = defineProps({
  states: { type: Object, default: () => ({}) },
})
defineEmits(['pick', 'hover', 'leave'])

const tiles = computed(() => DOMAINS.filter(d => d.slug !== 'dashboard'))
const stateOf = (slug) => props.states?.[slug]?.state || 'unset'
const countOf = (slug) => props.states?.[slug]?.count ?? null
</script>

<style scoped>
.ml { display: flex; flex-direction: column; gap: 12px; }
.ml-head { display: flex; align-items: center; justify-content: space-between; }
.ml-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--set-text-muted); }
.ml-eyebrow :deep(svg) { color: var(--set-gold); }
.ml-meta { font-size: 11px; color: var(--set-text-dim); }
.ml-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(232px, 1fr)); gap: 13px; }
@media (max-width: 520px) { .ml-grid { grid-template-columns: 1fr; } }
</style>
