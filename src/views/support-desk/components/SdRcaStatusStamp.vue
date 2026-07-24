<script setup>
/*
  SdRcaStatusStamp — THE one renderer of the RCA review state. Both desks, the
  drawer and the console read status through this so owed/filed/validated/
  returned/stale speak one color language (the --sd-rcas-* tokens, and ONLY
  here). Pass either a row (`row`) or an explicit status string (`status`).
*/
import { computed } from 'vue'
import { rcaStatusOf, RCA_STATUSES } from '@/composables/useSupportDesk'

const props = defineProps({
  row: { type: Object, default: null },
  status: { type: String, default: null },   // explicit override (board rows carry effective status)
  sm: { type: Boolean, default: false },     // compact variant for dense rows
  inherited: { type: Boolean, default: false }, // cascade-stamped provenance dot
})

const key = computed(() => {
  const k = props.status || (props.row ? rcaStatusOf(props.row) : 'owed')
  return RCA_STATUSES[k] ? k : 'owed'
})
const label = computed(() => RCA_STATUSES[key.value].label)
</script>

<template>
  <span class="rcas" :class="[`rcas--${key}`, { 'rcas--sm': sm }]">
    <span class="rcas-led" aria-hidden="true" />
    <span class="rcas-txt">{{ label }}</span>
    <span v-if="inherited" class="rcas-inh" title="Root cause inherited from a linked problem">◆</span>
  </span>
</template>

<style scoped>
.rcas {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px; border-radius: 4px;
  font-size: 10px; font-weight: 800; letter-spacing: 1.6px;
  font-family: 'Consolas', 'SF Mono', monospace;
  border: 1px solid transparent; white-space: nowrap;
  color: var(--rcas-ink); background: var(--rcas-bg); border-color: var(--rcas-brd);
}
.rcas--sm { padding: 2px 7px; font-size: 9px; letter-spacing: 1.2px; gap: 5px; }
.rcas-led {
  width: 6px; height: 6px; border-radius: 50%; flex: 0 0 auto;
  background: var(--rcas-ink); box-shadow: 0 0 6px var(--rcas-ink);
}
.rcas--sm .rcas-led { width: 5px; height: 5px; }
.rcas-inh { font-size: 8px; opacity: 0.85; }

.rcas--owed      { --rcas-ink: var(--sd-rcas-owed);      --rcas-bg: var(--sd-rcas-owed-soft);      --rcas-brd: color-mix(in srgb, var(--sd-rcas-owed) 38%, transparent); }
.rcas--filed     { --rcas-ink: var(--sd-rcas-filed);     --rcas-bg: var(--sd-rcas-filed-soft);     --rcas-brd: color-mix(in srgb, var(--sd-rcas-filed) 38%, transparent); }
.rcas--validated { --rcas-ink: var(--sd-rcas-validated); --rcas-bg: var(--sd-rcas-validated-soft); --rcas-brd: color-mix(in srgb, var(--sd-rcas-validated) 38%, transparent); }
.rcas--returned  { --rcas-ink: var(--sd-rcas-returned);  --rcas-bg: var(--sd-rcas-returned-soft);  --rcas-brd: color-mix(in srgb, var(--sd-rcas-returned) 38%, transparent); }
.rcas--stale     { --rcas-ink: var(--sd-rcas-stale);     --rcas-bg: var(--sd-rcas-stale-soft);     --rcas-brd: color-mix(in srgb, var(--sd-rcas-stale) 38%, transparent); }

/* the owed LED breathes — debt is live */
.rcas--owed .rcas-led { animation: rcas-breathe 2.2s ease-in-out infinite; }
@keyframes rcas-breathe { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
html:not([data-cinematic="on"]) .rcas--owed .rcas-led { animation: none; }
</style>
