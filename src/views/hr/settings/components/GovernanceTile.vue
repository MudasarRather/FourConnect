<template>
  <div class="gt-shell" :style="{ '--acc': domain.accent, '--i': index }">
    <div ref="inner" class="gt" :class="{ glow: state === 'ok' }"
      @mouseenter="$emit('hover', domain.slug)" @mouseleave="$emit('leave')"
      @click="$emit('pick', domain.slug)">
      <span class="gt-glare" aria-hidden="true" />
      <span class="gt-spine" aria-hidden="true" />
      <header class="gt-top">
        <span class="gt-ic"><component :is="domain.icon" :size="17" /></span>
        <SetStatusStamp :state="state" />
      </header>
      <b class="gt-name">{{ domain.label }}</b>
      <p class="gt-blurb">{{ domain.blurb }}</p>
      <footer class="gt-foot">
        <span class="gt-phase" :data-phase="domain.phase">Phase {{ domain.phase }}</span>
        <span v-if="count != null" class="gt-count set-mono">{{ count }}</span>
        <span class="gt-go"><ArrowRight :size="13" /></span>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ArrowRight } from 'lucide-vue-next'
import SetStatusStamp from './SetStatusStamp.vue'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  domain: { type: Object, required: true },
  index: { type: Number, default: 0 },
  state: { type: String, default: 'unset' },
  count: { type: [Number, null], default: null },
})
defineEmits(['pick', 'hover', 'leave'])

const inner = ref(null)
usePointerSpotlight(inner)
</script>

<style scoped>
.gt-shell { animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.035s); }
.gt { position: relative; overflow: hidden; height: 100%; display: flex; flex-direction: column; gap: 7px;
  padding: 15px 16px 13px; border-radius: 16px; cursor: pointer;
  background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow);
  transition: transform 0.3s var(--set-spring), border-color 0.3s, box-shadow 0.3s; }
.gt:hover { border-color: color-mix(in srgb, var(--acc) 40%, transparent); box-shadow: var(--set-card-shadow-hover);
  transform: perspective(1100px) rotateX(calc((var(--my, 0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg)) translateY(-2px); }
.gt-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(420px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%),
    color-mix(in srgb, var(--acc) 20%, transparent), transparent 60%); }
.gt-spine { position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--acc), color-mix(in srgb, var(--acc) 30%, transparent)); }
.gt.glow .gt-spine { box-shadow: 0 0 12px -1px var(--acc); }

.gt-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.gt-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; color: var(--acc);
  background: color-mix(in srgb, var(--acc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 26%, transparent); }
.gt-name { font-size: 14px; font-weight: 800; color: var(--set-text); }
.gt-blurb { margin: 0; font-size: 11.5px; line-height: 1.45; color: var(--set-text-muted); flex: 1;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.gt-foot { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.gt-phase { font-size: 9px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; padding: 2px 7px; border-radius: 999px;
  color: var(--set-text-dim); background: var(--set-unset-soft); border: 1px solid var(--set-border); }
.gt-phase[data-phase="A"] { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 30%, transparent); }
.gt-count { margin-left: auto; font-size: 11px; font-weight: 700; color: var(--set-text-secondary); }
.gt-go { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 8px; color: var(--set-text-dim);
  background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.25s var(--set-spring); margin-left: auto; }
.gt-foot .gt-count + .gt-go { margin-left: 0; }
.gt:hover .gt-go { color: var(--acc); border-color: color-mix(in srgb, var(--acc) 40%, transparent); transform: translateX(2px); }

@media (prefers-reduced-motion: reduce) {
  .gt-shell { animation: none; }
  .gt:hover { transform: translateY(-2px); }
}
</style>
