<template>
  <!-- SEV capsule — the module's shared severity stamp. SEV1 breathes (a live major
       incident is never visually calm); the rest hold steady. -->
  <span class="sevb" :class="[`s${sev}`, { lg }]">
    <i class="dot" aria-hidden="true" />
    <span class="lbl">SEV{{ sev }}</span>
  </span>
</template>

<script setup>
defineProps({
  sev: { type: Number, default: 4 },
  lg: { type: Boolean, default: false },
})
</script>

<style scoped>
.sevb { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 20px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.1em; font-family: var(--sd-mono);
  border: 1px solid transparent; white-space: nowrap; }
.sevb.lg { padding: 3px 11px; font-size: 11px; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.s1 { color: var(--sd-pri-critical); background: var(--sd-pri-critical-soft, rgba(239,68,68,0.14));
  border-color: color-mix(in srgb, var(--sd-pri-critical) 40%, transparent); }
.s1 .dot { animation: sevb-breathe 1.6s ease-in-out infinite; box-shadow: 0 0 8px currentColor; }
.s2 { color: var(--sd-pri-urgent); background: var(--sd-pri-urgent-soft, rgba(249,115,22,0.14));
  border-color: color-mix(in srgb, var(--sd-pri-urgent) 40%, transparent); }
.s3 { color: var(--sd-amber); background: var(--sd-amber-soft);
  border-color: color-mix(in srgb, var(--sd-amber) 38%, transparent); }
.s4 { color: var(--sd-text-muted); background: var(--sd-surface-elevated); border-color: var(--sd-border); }
@keyframes sevb-breathe { 0%, 100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.25); } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .s1 .dot { animation: none !important; }
}
</style>
