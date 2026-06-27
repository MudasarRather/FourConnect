<template>
  <span class="set-stamp" :data-state="state">
    <span class="set-stamp-led" aria-hidden="true" />
    {{ label || LABELS[state] || state }}
  </span>
</template>

<script setup>
defineProps({
  state: { type: String, default: 'unset' }, // ok | partial | unset | conflict
  label: { type: String, default: '' },
})
const LABELS = { ok: 'Configured', partial: 'Partial', unset: 'Not set', conflict: 'Conflict' }
</script>

<style scoped>
.set-stamp { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px 3px 7px; border-radius: 999px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--c, var(--set-unset)); background: var(--cs, var(--set-unset-soft));
  border: 1px solid color-mix(in srgb, var(--c, var(--set-unset)) 34%, transparent); white-space: nowrap; }
.set-stamp-led { width: 6px; height: 6px; border-radius: 50%; background: var(--c, var(--set-unset)); box-shadow: 0 0 8px var(--c, var(--set-unset)); }
.set-stamp[data-state="ok"] { --c: var(--set-ok); --cs: var(--set-ok-soft); }
.set-stamp[data-state="partial"] { --c: var(--set-partial); --cs: var(--set-partial-soft); }
.set-stamp[data-state="unset"] { --c: var(--set-unset); --cs: var(--set-unset-soft); }
.set-stamp[data-state="conflict"] { --c: var(--set-conflict); --cs: var(--set-conflict-soft); }
.set-stamp[data-state="ok"] .set-stamp-led { animation: set-led-pulse 2.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .set-stamp-led { animation: none !important; } }
</style>
