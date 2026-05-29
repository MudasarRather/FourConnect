<template>
  <div class="edoc-section">
    <Motion
      as="div" class="soon edoc-card"
      :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
    >
      <div class="soon-glow" aria-hidden="true" />
      <div class="soon-orb">
        <component :is="icon" :size="30" />
        <span class="ring" />
      </div>
      <span class="edoc-eyebrow">Pass 2 · In this module</span>
      <h2 class="soon-title">{{ title }}</h2>
      <p class="soon-body">{{ body }}</p>
      <ul class="soon-list">
        <li v-for="f in features" :key="f"><Sparkles :size="13" /> {{ f }}</li>
      </ul>
    </Motion>
  </div>
</template>

<script setup>
import { Motion } from 'motion-v'
import { Sparkles, FileText } from 'lucide-vue-next'

defineProps({
  icon: { type: [Object, Function], default: FileText },
  title: { type: String, default: 'Coming soon' },
  body: { type: String, default: '' },
  features: { type: Array, default: () => [] },
})
</script>

<style scoped>
.soon {
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; text-align: center;
  gap: 10px; padding: 56px 28px;
}
.soon-glow { position: absolute; inset: 0; background: var(--edoc-vault-glow); pointer-events: none; }
.soon-orb {
  position: relative; display: grid; place-items: center; width: 84px; height: 84px; border-radius: 50%;
  color: var(--hr-accent-gold); background: radial-gradient(circle, rgba(251,191,36,0.18), transparent 70%); margin-bottom: 4px;
}
.soon-orb .ring { position: absolute; inset: -8px; border-radius: 50%; border: 1px dashed var(--hr-accent-gold-border); border-top-color: var(--hr-accent-gold); animation: edoc-ring-rotate 5s linear infinite; }
.soon-title { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.01em; color: var(--hr-text); }
.soon-body { margin: 0; font-size: 13.5px; color: var(--hr-text-muted); max-width: 460px; }
.soon-list { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.soon-list li { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--hr-text-secondary); padding: 6px 12px; border-radius: 999px; background: rgba(255,255,255,0.03); border: 1px solid var(--hr-border); }
.soon-list li svg { color: var(--hr-accent-gold); }
[data-theme="light"] .soon-title { color: #1a1410; }
[data-theme="light"] .soon-body { color: #6b5840; }
[data-theme="light"] .soon-list li { background: rgba(255,250,240,0.6); border-color: rgba(40,25,10,0.12); color: #44362a; }
</style>
