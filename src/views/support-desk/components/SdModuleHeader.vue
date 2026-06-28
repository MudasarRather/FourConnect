<template>
  <Motion as="header" class="sd-mh sd-grain" :style="{ '--ac': meta.accent }"
    :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
    <div class="mh-aura" />
    <component :is="meta.icon" :size="150" class="mh-ghost" />

    <div class="mh-lead">
      <span class="mh-eyebrow"><component :is="meta.icon" :size="13" /> SUPPORT · {{ (meta.group || '').toUpperCase() }}</span>
      <h1 class="mh-title">{{ titleHead }}<span v-if="titleTail" class="grad"> {{ titleTail }}</span></h1>
      <p class="mh-sub">{{ meta.sub }}</p>
    </div>
    <div class="mh-actions"><slot name="actions" /></div>
  </Motion>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { getModule } from '../modules.js'

const props = defineProps({
  moduleKey: { type: String, default: '' },
  mod: { type: Object, default: null }, // pass a registry module directly (preferred)
})
const meta = computed(() => props.mod || getModule(props.moduleKey))

// split the label so the last word gets the gradient accent
const parts = computed(() => (meta.value.label || '').split(' '))
const titleHead = computed(() => parts.value.length > 1 ? parts.value.slice(0, -1).join(' ') : meta.value.label)
const titleTail = computed(() => parts.value.length > 1 ? parts.value[parts.value.length - 1] : '')
</script>

<style scoped>
.sd-mh {
  position: relative; overflow: hidden; border-radius: 20px; padding: 22px 24px;
  display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; flex-wrap: wrap;
  background:
    radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--ac) 10%, transparent), transparent 55%),
    var(--sd-surface);
  border: 1px solid var(--sd-border); box-shadow: var(--sd-card-shadow);
}
.mh-aura { position: absolute; inset: -40% 0 auto auto; width: 320px; height: 320px; pointer-events: none; background: radial-gradient(circle, color-mix(in srgb, var(--ac) 22%, transparent), transparent 70%); filter: blur(8px); opacity: 0.5; }
.mh-ghost { position: absolute; right: -28px; bottom: -42px; color: var(--ac); opacity: 0.06; pointer-events: none; animation: sd-spin-slow 90s linear infinite; }

.mh-lead { position: relative; z-index: 1; min-width: 0; }
.mh-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.12em; color: var(--ac); font-family: var(--sd-mono); }
.mh-title { font-size: clamp(22px, 3vw, 30px); font-weight: 800; color: var(--sd-text); margin: 8px 0 5px; letter-spacing: -0.02em; line-height: 1.05; }
.mh-title .grad { background: var(--sd-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.mh-sub { font-size: 13px; color: var(--sd-text-muted); margin: 0; max-width: 560px; }
.mh-actions { position: relative; z-index: 1; display: flex; gap: 9px; align-items: center; }

@media (prefers-reduced-motion: reduce) { .mh-ghost { animation: none; } }
</style>
