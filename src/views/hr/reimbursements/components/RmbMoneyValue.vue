<template>
  <span class="rmb-money-value" :class="tone">
    <span class="cur">₹</span><RmbCountUp :value="num" :decimals="decimals" />
  </span>
</template>

<script setup>
import { computed } from 'vue'
import RmbCountUp from './RmbCountUp.vue'

const props = defineProps({
  value: { type: [Number, String], default: 0 },
  decimals: { type: Number, default: 0 },
  tone: { type: String, default: '' },   // '' | 'positive' | 'pending'
})
const num = computed(() => Number(props.value) || 0)
</script>

<style scoped>
.rmb-money-value {
  font-family: var(--rmb-mono);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--rmb-money);
  display: inline-flex; align-items: baseline; gap: 1px;
}
.rmb-money-value .cur { font-size: 0.7em; opacity: 0.75; }
.rmb-money-value.positive { color: var(--rmb-money-positive); }
.rmb-money-value.pending { color: var(--rmb-money-pending); }
</style>
