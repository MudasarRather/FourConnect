<template>
  <div class="sfb">
    <Motion v-for="(t, i) in tiles" :key="t.key" as="button" type="button"
      class="sfb-tile" :class="{ clickable: t.go }" :style="{ '--accent': t.accent || 'var(--trv-amber)' }"
      :initial="{ opacity: 0, rotateX: -70 }" :animate="{ opacity: 1, rotateX: 0 }"
      :transition="{ duration: 0.55, delay: 0.06 * i, ease: [0.16, 1, 0.3, 1] }"
      :whileHover="t.go ? { y: -3 } : {}" @click="t.go && $emit('go', t.go)">
      <span class="sfb-seam" aria-hidden="true" />
      <div class="sfb-head">
        <component :is="t.icon" v-if="t.icon" :size="14" class="sfb-ico" />
        <span class="sfb-label">{{ t.label }}</span>
      </div>
      <div class="sfb-value trv-mono">
        <TrvCountUp :value="Number(t.value) || 0" :format="t.format" :prefix="t.prefix || ''" :suffix="t.suffix || ''" />
      </div>
      <span class="sfb-sub">{{ t.sub }}</span>
    </Motion>
  </div>
</template>

<script setup>
import { Motion } from 'motion-v'
import TrvCountUp from './TrvCountUp.vue'
defineProps({ tiles: { type: Array, default: () => [] } })
defineEmits(['go'])
</script>

<style scoped>
.sfb {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;
}
.sfb-tile {
  position: relative; text-align: left; cursor: default; overflow: hidden;
  padding: 14px 16px 13px; border-radius: 14px; border: 1px solid var(--trv-border-strong);
  background: linear-gradient(180deg, var(--trv-flap) 0%, color-mix(in srgb, var(--trv-flap) 86%, #000) 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), var(--trv-card-shadow);
  transform-origin: top center; perspective: 600px;
}
.sfb-tile.clickable { cursor: pointer; }
.sfb-tile.clickable:hover { border-color: var(--accent); }
.sfb-seam {
  position: absolute; left: 0; right: 0; top: 50%; height: 1px;
  background: var(--trv-flap-seam); box-shadow: 0 1px 0 rgba(0,0,0,0.4);
}
.sfb-head { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.sfb-ico { color: var(--accent); }
.sfb-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--trv-text-muted);
}
.sfb-value {
  font-size: 30px; font-weight: 800; line-height: 1; color: var(--trv-flap-text);
  text-shadow: 0 1px 0 rgba(0,0,0,0.5); letter-spacing: -0.01em;
}
.sfb-sub { display: block; margin-top: 6px; font-size: 11px; color: var(--trv-text-dim); }
[data-theme="light"] .sfb-value { color: #fcd34d; }
@media (prefers-reduced-motion: reduce) { .sfb-tile { perspective: none; } }
</style>
