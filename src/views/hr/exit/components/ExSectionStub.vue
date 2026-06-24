<template>
  <div class="ex-stub-wrap">
    <ExSectionHead :icon="icon" :eyebrow="eyebrow" :title="title" :accent="accent" :subtitle="subtitle" />
    <Motion as="div" class="ex-stub ex-card ex-grain"
      :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
      <span class="stub-arch" aria-hidden="true">
        <span class="arch-post left" /><span class="arch-post right" />
        <span class="arch-lintel" /><span class="arch-beam" />
      </span>
      <component :is="icon || DoorOpen" :size="34" class="stub-icon" />
      <div class="stub-title">{{ title }}</div>
      <div class="stub-sub">Crafting this gateway — arriving in a later build phase.</div>
    </Motion>
  </div>
</template>

<script setup>
import { Motion } from 'motion-v'
import { DoorOpen } from 'lucide-vue-next'
import ExSectionHead from './ExSectionHead.vue'
defineProps({
  icon: { type: [Object, Function], default: null },
  eyebrow: { type: String, default: 'Exit Management' },
  title: { type: String, default: 'Section' },
  accent: { type: String, default: '' },
  subtitle: { type: String, default: '' },
})
</script>

<style scoped>
.ex-stub {
  position: relative; overflow: hidden; min-height: 320px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
  text-align: center; padding: 40px;
}
.stub-arch { position: absolute; inset: 0; display: grid; place-items: center; opacity: 0.5; pointer-events: none; }
.arch-post { position: absolute; bottom: 18%; width: 10px; height: 46%; border-radius: 6px 6px 0 0;
  background: var(--ex-grad-dusk); opacity: 0.32; }
.arch-post.left { left: 32%; } .arch-post.right { right: 32%; }
.arch-lintel { position: absolute; bottom: 64%; width: 38%; height: 10px; border-radius: 6px; background: var(--ex-grad-dusk); opacity: 0.32; }
.arch-beam { position: absolute; bottom: 18%; width: 2px; height: 46%; background: linear-gradient(180deg, var(--ex-violet), transparent); opacity: 0.4; filter: blur(1px);
  animation: ex-beam-seal 3.4s ease-in-out infinite alternate; transform-origin: bottom; }
.stub-icon { position: relative; color: var(--ex-violet); filter: drop-shadow(0 0 14px rgba(251,146,60,0.4)); }
.stub-title { position: relative; font-size: 18px; font-weight: 800; color: var(--ex-text); }
.stub-sub { position: relative; font-size: 13px; color: var(--ex-text-muted); max-width: 360px; }
@media (prefers-reduced-motion: reduce) { .arch-beam { animation: none; } }
</style>
