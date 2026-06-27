<template>
  <div class="set-empty" :style="{ '--acc': accentColor }">
    <span class="set-empty-glow" aria-hidden="true" />
    <span class="set-empty-ic"><component :is="icon" :size="26" /></span>
    <h3>{{ title }}</h3>
    <p v-if="sub">{{ sub }}</p>
    <div v-if="$slots.default" class="set-empty-actions"><slot /></div>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: [Object, Function], required: true },
  title: { type: String, default: 'Nothing here yet' },
  sub: { type: String, default: '' },
  accentColor: { type: String, default: 'var(--set-gold)' },
})
</script>

<style scoped>
.set-empty { position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center;
  text-align: center; gap: 10px; padding: 48px 28px; border-radius: 18px;
  background: var(--set-surface); border: 1px dashed var(--set-border-strong); }
.set-empty-glow { position: absolute; inset: auto 0 -40% 0; height: 80%; pointer-events: none;
  background: radial-gradient(circle at 50% 100%, color-mix(in srgb, var(--acc) 16%, transparent), transparent 70%); filter: blur(28px); }
.set-empty-ic { position: relative; display: grid; place-items: center; width: 56px; height: 56px; border-radius: 16px;
  color: var(--acc); background: color-mix(in srgb, var(--acc) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--acc) 28%, transparent); }
.set-empty h3 { position: relative; margin: 6px 0 0; font-size: 16px; font-weight: 800; color: var(--set-text); }
.set-empty p { position: relative; margin: 0; font-size: 13px; color: var(--set-text-muted); max-width: 52ch; line-height: 1.5; }
.set-empty-actions { position: relative; display: flex; gap: 10px; margin-top: 8px; flex-wrap: wrap; justify-content: center; }
</style>
