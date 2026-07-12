<template>
  <!-- Charged step-conduit v2 — core-component-level animation:
       · the rail charges to the active node with a flowing gradient + a travelling COMET
       · every node is a faceted tile with its own conic completion arc
       · done → the arc snaps full + an SVG tick DRAWS itself + a pop spring
       · active → orbiting dash ring + soft breathing halo (pseudo-element only,
         nothing in the layout ever moves)
       · click a reached node to jump (magnetic hover / tap via motion-v) -->
  <nav class="sd-stepper" :style="{ '--prog': progFill }" aria-label="Create-ticket steps">
    <span class="ss-rail" aria-hidden="true">
      <span class="ss-charge" />
      <span class="ss-comet" />
    </span>
    <Motion
      v-for="(s, i) in steps" :key="s.key"
      as="button" type="button"
      class="ss-node"
      :class="{ done: s.done, active: i === current, reachable: i <= reached && i !== current, locked: i > reached }"
      :disabled="i > reached"
      :initial="{ opacity: 0, y: 12 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.45, delay: 0.04 + i * 0.055, ease: [0.16, 1, 0.3, 1] }"
      :whileHover="i <= reached ? { y: -3 } : {}"
      :whileTap="i <= reached ? { scale: 0.93 } : {}"
      @click="i <= reached && emit('jump', i)"
    >
      <span class="ss-tile">
        <span class="ss-arc" aria-hidden="true" />
        <span class="ss-halo" aria-hidden="true" />
        <svg v-if="s.done && i !== current" class="ss-tick" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.2,8.4 L6.4,11.6 L12.8,4.6" />
        </svg>
        <component v-else :is="s.icon || Circle" :size="14" class="ss-ic" />
        <span class="ss-orbit" aria-hidden="true" />
      </span>
      <span class="ss-meta">
        <span class="ss-no">{{ String(i + 1).padStart(2, '0') }}</span>
        <span class="ss-lbl">{{ s.label }}<i class="ss-under" aria-hidden="true" /></span>
      </span>
    </Motion>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Circle } from 'lucide-vue-next'

const props = defineProps({
  steps: { type: Array, default: () => [] },   // [{ key, label, icon, done }]
  current: { type: Number, default: 0 },
  reached: { type: Number, default: 0 },
})
const emit = defineEmits(['jump'])

const progFill = computed(() => {
  const n = props.steps.length
  return n > 1 ? `${(Math.max(0, props.current) / (n - 1)) * 100}%` : '0%'
})
</script>

<style scoped>
.sd-stepper { position: relative; display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; width: 100%; }

/* the conduit rail + charge + comet */
.ss-rail { position: absolute; top: 19px; left: 24px; right: 24px; height: 2.5px; border-radius: 3px; overflow: hidden;
  background: color-mix(in srgb, var(--sd-border-strong) 90%, transparent); }
.ss-charge { position: absolute; inset: 0 auto 0 0; width: var(--prog, 0%); border-radius: inherit;
  background: var(--sd-grad-rail); background-size: 200% 100%;
  box-shadow: 0 0 14px color-mix(in srgb, var(--sd-ember) 65%, transparent);
  transition: width 0.6s var(--sd-spring); animation: sd-rail-flow 3s linear infinite; }
.ss-comet { position: absolute; top: 50%; left: 0; width: 34px; height: 2.5px; transform: translateY(-50%); border-radius: 3px;
  background: linear-gradient(90deg, transparent, #ffd166, #fff); filter: drop-shadow(0 0 5px #ffb900);
  animation: ss-comet 3.4s cubic-bezier(0.5, 0, 0.5, 1) infinite; }
@keyframes ss-comet { 0% { left: -6%; opacity: 0; } 8% { opacity: 1; } 84% { opacity: 1; } 100% { left: calc(var(--prog, 0%) - 8px); opacity: 0; } }

/* nodes */
.ss-node { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1; min-width: 0;
  background: none; border: 0; padding: 0; cursor: pointer; font-family: inherit; }
.ss-node[disabled] { cursor: default; }

/* faceted tile with its own completion arc */
.ss-tile { position: relative; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 14px;
  color: var(--sd-text-muted); background: var(--sd-surface-elevated); border: 1.5px solid var(--sd-border-strong);
  transition: color 0.3s, background 0.3s, border-color 0.3s, transform 0.35s var(--sd-spring), box-shadow 0.35s; }
.ss-arc { position: absolute; inset: -5px; border-radius: 17px; padding: 2px; opacity: 0;
  background: conic-gradient(var(--sd-amber) 0deg, transparent 0deg);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude;
  transition: opacity 0.4s; }
.ss-halo { position: absolute; inset: -8px; border-radius: 20px; opacity: 0; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--sd-amber) 30%, transparent), transparent 70%); }
.ss-ic { position: relative; z-index: 1; transition: transform 0.3s var(--sd-spring); }
.ss-node.reachable:hover .ss-tile { border-color: var(--sd-amber-border); color: var(--sd-amber); box-shadow: 0 6px 16px color-mix(in srgb, var(--sd-amber) 18%, transparent); }
.ss-node.reachable:hover .ss-ic { transform: scale(1.12); }

/* DONE — arc snaps full, tile flips emerald, the tick draws itself, spring pop */
.ss-node.done .ss-tile { color: var(--sd-success); background: var(--sd-success-soft);
  border-color: color-mix(in srgb, var(--sd-success) 45%, transparent); animation: ss-pop 0.5s var(--sd-spring); }
.ss-node.done .ss-arc { opacity: 1; background: conic-gradient(var(--sd-success) 360deg, transparent 0deg); }
.ss-tick { width: 16px; height: 16px; position: relative; z-index: 1; }
.ss-tick path { fill: none; stroke: var(--sd-success); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 16; stroke-dashoffset: 16; animation: ss-draw 0.45s 0.1s var(--sd-spring) forwards; }
@keyframes ss-draw { to { stroke-dashoffset: 0; } }
@keyframes ss-pop { 0% { transform: scale(0.86); } 55% { transform: scale(1.1); } 100% { transform: scale(1); } }

/* ACTIVE — molten tile + orbiting dash ring + breathing halo (no layout shift) */
.ss-node.active .ss-tile { color: #1a1206; background: var(--sd-grad-hero); border-color: transparent;
  transform: scale(1.12); box-shadow: 0 0 0 5px var(--sd-amber-soft), 0 10px 26px rgba(251, 146, 60, 0.34); }
[data-theme="light"] .ss-node.active .ss-tile { color: #fff8ec; }
.ss-orbit { position: absolute; inset: -7px; border-radius: 19px; border: 1.5px dashed color-mix(in srgb, var(--sd-amber) 60%, transparent); opacity: 0; }
.ss-node.active .ss-orbit { opacity: 1; animation: ss-orbit 7s linear infinite; }
.ss-node.active .ss-halo { opacity: 1; animation: ss-breathe 2.6s ease-in-out infinite; }
@keyframes ss-orbit { to { transform: rotate(360deg); } }
@keyframes ss-breathe { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.85; } }

/* labels */
.ss-meta { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 0; }
.ss-no { font-family: var(--sd-mono); font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-text-dim); transition: color 0.25s; }
.ss-lbl { position: relative; font-size: 10.5px; font-weight: 700; letter-spacing: 0.01em; color: var(--sd-text-muted); white-space: nowrap; transition: color 0.25s; padding-bottom: 3px; }
.ss-under { position: absolute; left: 50%; bottom: 0; width: 0; height: 2px; border-radius: 2px; transform: translateX(-50%);
  background: var(--sd-grad-hero); transition: width 0.35s var(--sd-spring); }
.ss-node.active .ss-lbl { color: var(--sd-text); }
.ss-node.active .ss-under { width: 100%; }
.ss-node.active .ss-no { color: var(--sd-amber); }
.ss-node.done .ss-lbl { color: var(--sd-text-secondary); }
.ss-node.locked .ss-tile { opacity: 0.75; }

@media (max-width: 640px) { .ss-lbl, .ss-no { display: none; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .ss-charge,
  html:not([data-cinematic="on"]) .ss-comet,
  html:not([data-cinematic="on"]) .ss-orbit,
  html:not([data-cinematic="on"]) .ss-halo,
  html:not([data-cinematic="on"]) .ss-tick path { animation: none; }
  html:not([data-cinematic="on"]) .ss-tick path { stroke-dashoffset: 0; }
  html:not([data-cinematic="on"]) .ss-comet { display: none; }
}
</style>
