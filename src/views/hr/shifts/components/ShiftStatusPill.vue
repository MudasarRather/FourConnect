<template>
  <span class="shift-pill" :data-tone="tone">
    <span class="pip" />
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup>
defineProps({
  label: { type: String, default: '' },
  // tone: ok | warn | alert | neutral | gold
  tone: { type: String, default: 'neutral' },
})
</script>

<style scoped>
.shift-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 9px; border-radius: 999px;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.03em;
  font-family: var(--shift-mono); text-transform: uppercase;
  border: 1px solid transparent;
}
.pip { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.shift-pill[data-tone="ok"]      { color: var(--shift-ok);    background: var(--shift-ok-soft);    border-color: color-mix(in srgb, var(--shift-ok) 30%, transparent); }
.shift-pill[data-tone="warn"]    { color: var(--shift-ember-strong); background: var(--shift-warn-soft); border-color: color-mix(in srgb, var(--shift-ember) 30%, transparent); }
.shift-pill[data-tone="alert"]   { color: var(--shift-alert);  background: var(--shift-alert-soft); border-color: color-mix(in srgb, var(--shift-alert) 32%, transparent); }
.shift-pill[data-tone="gold"]    { color: var(--shift-amber);  background: rgba(251,191,36,0.12);  border-color: rgba(251,191,36,0.3); }
.shift-pill[data-tone="neutral"] { color: var(--shift-text-muted); background: rgba(148,163,184,0.10); border-color: var(--shift-border-soft); }
</style>
