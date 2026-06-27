<template>
  <button type="button" class="gb-chip" :class="{ active, dim }" :style="{ '--acc': domain.accent }"
    @mouseenter="$emit('focus', domain.slug)" @mouseleave="$emit('blur')"
    @click="$emit('pick', domain.slug)" :title="domain.label">
    <span class="gb-chip-led" :data-state="ledState" aria-hidden="true" />
    <span class="gb-chip-ic"><component :is="domain.icon" :size="15" /></span>
    <span class="gb-chip-txt">
      <span class="gb-chip-name">{{ domain.label }}</span>
      <span class="gb-chip-pins set-mono">{{ pinLabel }}</span>
    </span>
    <span class="gb-chip-port" aria-hidden="true" />
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  domain: { type: Object, required: true },
  active: { type: Boolean, default: false },
  dim: { type: Boolean, default: false },
  ledState: { type: String, default: 'unset' }, // ok | partial | unset | conflict
  count: { type: [Number, null], default: null },
})
defineEmits(['focus', 'blur', 'pick'])

const pinLabel = computed(() => {
  const n = (props.domain.governs || []).length
  if (props.count != null) return `${props.count} · ${n}p`
  return `${n} pin${n === 1 ? '' : 's'}`
})
</script>

<style scoped>
.gb-chip { position: absolute; display: flex; align-items: center; gap: 8px; width: 13%; height: 10.6%;
  padding: 0 9px; border-radius: 11px; cursor: pointer; text-align: left; font: inherit;
  background: var(--set-surface-elevated); border: 1px solid var(--set-border);
  box-shadow: 0 6px 18px -12px rgba(0,0,0,0.7); color: var(--set-text-secondary);
  transition: transform 0.25s var(--set-spring), border-color 0.25s var(--set-spring),
              box-shadow 0.25s, opacity 0.3s, background 0.25s; }
.gb-chip:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--acc) 40%, transparent); }
.gb-chip.active { border-color: color-mix(in srgb, var(--acc) 60%, transparent);
  background: color-mix(in srgb, var(--acc) 12%, var(--set-surface-elevated));
  box-shadow: 0 10px 26px -12px color-mix(in srgb, var(--acc) 50%, transparent), 0 0 0 1px color-mix(in srgb, var(--acc) 30%, transparent); }
.gb-chip.dim { opacity: 0.34; }

.gb-chip-led { position: absolute; top: 7px; right: 8px; width: 6px; height: 6px; border-radius: 50%;
  background: var(--l, var(--set-unset)); box-shadow: 0 0 7px var(--l, var(--set-unset)); }
.gb-chip-led[data-state="ok"] { --l: var(--set-ok); animation: set-led-pulse 2.6s ease-in-out infinite; }
.gb-chip-led[data-state="partial"] { --l: var(--set-partial); }
.gb-chip-led[data-state="unset"] { --l: var(--set-unset); }
.gb-chip-led[data-state="conflict"] { --l: var(--set-conflict); }

.gb-chip-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
  color: var(--acc); background: color-mix(in srgb, var(--acc) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--acc) 26%, transparent); }
.gb-chip-txt { display: flex; flex-direction: column; min-width: 0; gap: 1px; }
.gb-chip-name { font-size: 11px; font-weight: 700; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.15; }
.gb-chip-pins { font-size: 8.5px; color: var(--set-text-dim); }
.gb-chip-port { position: absolute; right: -4px; top: 50%; width: 7px; height: 7px; border-radius: 50%; transform: translateY(-50%);
  background: var(--set-surface); border: 1px solid var(--acc); transition: box-shadow 0.25s; }
.gb-chip.active .gb-chip-port { box-shadow: 0 0 10px var(--acc); background: var(--acc); }

@media (prefers-reduced-motion: reduce) { .gb-chip-led { animation: none !important; } }
</style>
