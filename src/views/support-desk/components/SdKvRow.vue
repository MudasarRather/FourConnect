<template>
  <div class="sdkv" :class="[tone && 'tone-' + tone, { full }]" :style="{ '--i': index }">
    <span class="sdkv-glare" aria-hidden="true" />
    <span class="sdkv-ic"><component :is="icon || Dot" :size="14" /></span>
    <span class="sdkv-body">
      <span class="sdkv-label">{{ label }}</span>
      <span class="sdkv-value" :class="{ mono }">
        <slot>{{ display }}</slot>
      </span>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Dot } from 'lucide-vue-next'

const props = defineProps({
  icon: { type: [Object, Function], default: null },
  label: { type: String, required: true },
  value: { type: [String, Number], default: undefined },
  tone: { type: String, default: '' },     // '' | good | warn | danger | muted
  full: { type: Boolean, default: false },
  mono: { type: Boolean, default: false },
  index: { type: Number, default: 0 },
})

const display = computed(() => {
  const v = props.value
  if (v === undefined || v === null || v === '') return '—'
  return v
})
</script>

<style scoped>
.sdkv {
  position: relative; display: flex; align-items: center; gap: 10px; min-width: 0;
  padding: 9px 11px; border-radius: 12px; overflow: hidden;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border);
  transition: border-color 0.22s var(--sd-spring), transform 0.22s var(--sd-spring), background 0.22s;
  animation: sdkv-in 0.44s var(--sd-spring) both; animation-delay: calc(var(--i, 0) * 0.04s);
}
.sdkv.full { grid-column: 1 / -1; }
.sdkv:hover { border-color: var(--sd-amber-border); transform: translateY(-1px); }

/* sweeping glare on hover */
.sdkv-glare { position: absolute; inset: 0; pointer-events: none; opacity: 0; border-radius: inherit;
  background: linear-gradient(105deg, transparent 30%, rgba(251, 191, 36, 0.1) 50%, transparent 70%);
  transform: translateX(-120%); transition: opacity 0.2s; }
.sdkv:hover .sdkv-glare { opacity: 1; animation: sdkv-sheen 0.85s var(--sd-ease); }

.sdkv-ic { flex-shrink: 0; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px;
  color: var(--sd-amber); background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border);
  transition: transform 0.26s var(--sd-spring), box-shadow 0.26s; }
.sdkv:hover .sdkv-ic { transform: scale(1.08) rotate(-3deg); box-shadow: 0 0 14px -2px var(--sd-fluid-glow); }

.sdkv-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.sdkv-label { font-size: 9.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--sd-text-dim); }
.sdkv-value { font-size: 13px; font-weight: 650; color: var(--sd-text); overflow-wrap: anywhere; line-height: 1.32; }
.sdkv-value.mono { font-family: var(--sd-mono); font-size: 12px; letter-spacing: 0.01em; }
.sdkv-value :deep(a) { color: var(--sd-amber); text-decoration: none; }
.sdkv-value :deep(a:hover) { text-decoration: underline; }
.sdkv-value :deep(.breach) { color: var(--sd-danger); }
.sdkv-value :deep(.pcode) { font-style: normal; font-size: 10px; font-weight: 800; font-family: var(--sd-mono); color: var(--sd-text-dim); margin-left: 3px; }

/* tones recolour the icon tile */
.sdkv.tone-good .sdkv-ic { color: var(--sd-success); background: var(--sd-success-soft); border-color: color-mix(in srgb, var(--sd-success) 30%, transparent); }
.sdkv.tone-good:hover { border-color: color-mix(in srgb, var(--sd-success) 34%, transparent); }
.sdkv.tone-warn .sdkv-ic { color: var(--sd-warning); background: var(--sd-warning-soft); border-color: color-mix(in srgb, var(--sd-warning) 32%, transparent); }
.sdkv.tone-danger .sdkv-ic { color: var(--sd-danger); background: var(--sd-danger-soft); border-color: color-mix(in srgb, var(--sd-danger) 32%, transparent); }
.sdkv.tone-danger:hover { border-color: color-mix(in srgb, var(--sd-danger) 36%, transparent); }
.sdkv.tone-muted .sdkv-ic { color: var(--sd-text-muted); background: var(--sd-surface); border-color: var(--sd-border-strong); }

@keyframes sdkv-in { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: none; } }
@keyframes sdkv-sheen { from { transform: translateX(-120%); } to { transform: translateX(120%); } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .sdkv { animation: none; }
  html:not([data-cinematic="on"]) .sdkv:hover .sdkv-glare { animation: none; }
}
</style>
