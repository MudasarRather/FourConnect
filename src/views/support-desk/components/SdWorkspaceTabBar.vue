<template>
  <nav class="sw-tabs" :style="{ '--ac': accent }" aria-label="Module sections">
    <div ref="trackEl" class="sw-tabs-track">
      <span class="sw-marker" :style="markerStyle" />
      <button
        v-for="t in tabs"
        :key="t.key"
        ref="tabEls"
        type="button"
        class="sw-tab"
        :class="{ on: t.key === modelValue, soon: t.kind === 'placeholder' }"
        :data-key="t.key"
        @click="$emit('update:modelValue', t.key)"
      >
        <span class="sw-tab-label">{{ t.label }}</span>
        <span v-if="t.kind === 'placeholder'" class="sw-soon">soon</span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  tabs: { type: Array, default: () => [] },
  modelValue: { type: String, default: '' },
  accent: { type: String, default: 'var(--sd-amber)' },
})
defineEmits(['update:modelValue'])

const trackEl = ref(null)
const tabEls = ref([])
const markerStyle = ref({ opacity: 0 })

const positionMarker = () => {
  const track = trackEl.value
  if (!track) return
  const el = track.querySelector(`.sw-tab[data-key="${CSS.escape(props.modelValue)}"]`)
  if (!el) { markerStyle.value = { opacity: 0 }; return }
  markerStyle.value = {
    opacity: 1,
    width: `${el.offsetWidth}px`,
    transform: `translateX(${el.offsetLeft}px)`,
  }
  // keep the active tab in view
  el.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
}

let ro = null
onMounted(() => {
  nextTick(positionMarker)
  ro = new ResizeObserver(() => positionMarker())
  if (trackEl.value) ro.observe(trackEl.value)
})
onBeforeUnmount(() => { ro?.disconnect() })
watch(() => props.modelValue, () => nextTick(positionMarker))
watch(() => props.tabs, () => nextTick(positionMarker), { deep: true })
</script>

<style scoped>
.sw-tabs { position: relative; }
.sw-tabs-track {
  position: relative; display: flex; gap: 4px; overflow-x: auto; padding: 5px;
  border-radius: 14px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border);
  scrollbar-width: thin;
}
.sw-tabs-track::-webkit-scrollbar { height: 5px; }
.sw-tabs-track::-webkit-scrollbar-thumb { background: var(--sd-border-strong); border-radius: 999px; }

.sw-marker {
  position: absolute; top: 5px; bottom: 5px; left: 0; border-radius: 10px;
  background: color-mix(in srgb, var(--ac) 16%, var(--sd-surface-elevated));
  border: 1px solid color-mix(in srgb, var(--ac) 40%, transparent);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22);
  transition: transform 0.34s var(--sd-spring), width 0.34s var(--sd-spring), opacity 0.2s;
  pointer-events: none;
}
.sw-tab {
  position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 7px; flex-shrink: 0;
  padding: 8px 14px; border-radius: 10px; background: none; border: none; cursor: pointer; white-space: nowrap;
  color: var(--sd-text-muted); font-size: 12.5px; font-weight: 600;
  transition: color 0.2s, transform 0.2s var(--sd-spring);
}
.sw-tab:hover { color: var(--sd-text); }
.sw-tab.on { color: var(--sd-text); }
.sw-tab.on .sw-tab-label { background: var(--sd-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; font-weight: 700; }
.sw-soon { font-size: 8.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--sd-text-dim); padding: 1px 5px; border-radius: 5px; background: var(--sd-surface); }
.sw-tab.on .sw-soon { color: var(--ac); }

@media (prefers-reduced-motion: reduce) {
  .sw-marker { transition: opacity 0.2s; }
}
</style>
