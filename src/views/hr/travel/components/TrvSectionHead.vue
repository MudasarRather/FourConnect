<template>
  <Motion as="header" class="trv-sechead trv-grain"
    :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
    <span class="sh-aura" aria-hidden="true" />
    <div class="sh-lead">
      <span class="sh-eyebrow"><component :is="icon" v-if="icon" :size="12" /> {{ eyebrow }}</span>
      <h2 class="sh-title">{{ title }} <span v-if="accent" class="grad">{{ accent }}</span></h2>
      <p v-if="subtitle" class="sh-sub">{{ subtitle }}</p>
    </div>
    <div class="sh-actions"><slot name="actions" /></div>
    <div v-if="$slots.lenses" class="sh-lenses"><slot name="lenses" /></div>
  </Motion>
</template>

<script setup>
import { Motion } from 'motion-v'
defineProps({
  icon: { type: [Object, Function], default: null },
  eyebrow: { type: String, default: '' },
  title: { type: String, default: '' },
  accent: { type: String, default: '' },
  subtitle: { type: String, default: '' },
})
</script>

<style scoped>
.trv-sechead {
  position: relative; overflow: hidden; display: grid;
  grid-template-columns: 1fr auto; gap: 14px; align-items: end;
  padding: 20px 22px; border-radius: 20px; margin-bottom: 16px;
  background: var(--trv-surface-elevated); border: 1px solid var(--trv-border);
  box-shadow: var(--trv-card-shadow);
}
.sh-aura { position: absolute; inset: -40% 50% 30% -10%; background: radial-gradient(60% 80% at 20% 0%, rgba(251,191,36,0.14), transparent 70%); animation: trv-aura-drift 10s ease-in-out infinite; pointer-events: none; }
.sh-lead { position: relative; }
.sh-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--trv-amber); padding: 4px 10px; border-radius: 999px; background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.sh-title { font-size: clamp(20px, 3vw, 28px); font-weight: 820; margin: 10px 0 4px; color: var(--trv-text); line-height: 1.1; }
.sh-title .grad { background: var(--trv-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.sh-sub { font-size: 13px; color: var(--trv-text-secondary); margin: 0; max-width: 520px; }
.sh-actions { position: relative; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.sh-lenses { grid-column: 1 / -1; position: relative; display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
@media (max-width: 640px) { .trv-sechead { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .sh-aura { animation: none; } }
</style>
