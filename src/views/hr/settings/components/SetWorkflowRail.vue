<template>
  <div class="wf" :class="{ 'is-h': isH }" :style="{ '--acc': accent }">
    <span class="wf-grid" aria-hidden="true" />
    <span class="wf-aura" aria-hidden="true" />
    <span v-if="!isH" class="wf-scan" aria-hidden="true" />

    <!-- mode + heading -->
    <Motion as="div" class="wf-head"
      :initial="{ opacity: 0, y: -6 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
      <span class="wf-mode" :data-mode="mode">
        <span class="wf-mode-dot" /> {{ modeLabel }}
      </span>
      <span class="wf-title"><component :is="icon" :size="13" /> {{ title }}</span>
    </Motion>

    <Motion v-if="summary" as="p" class="wf-summary"
      :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, delay: 0.06, ease: [0.16, 1, 0.3, 1] }">
      {{ summary }}
    </Motion>

    <!-- process steps -->
    <div v-if="steps.length" class="wf-steps">
      <span v-if="!isH" class="wf-spine" aria-hidden="true" />
      <Motion v-for="(s, i) in steps" :key="i" as="div" class="wf-step"
        :initial="{ opacity: 0, x: isH ? 0 : 12, y: isH ? 10 : 0 }" :animate="{ opacity: 1, x: 0, y: 0 }"
        :transition="{ duration: 0.42, delay: 0.12 + i * 0.08, ease: [0.16, 1, 0.3, 1] }">
        <span class="wf-node">
          <component v-if="s.icon" :is="s.icon" :size="12" />
          <b v-else>{{ i + 1 }}</b>
        </span>
        <div class="wf-step-body">
          <b>{{ s.title }}</b>
          <span>{{ s.text }}</span>
        </div>
      </Motion>
    </div>

    <!-- caution / system note -->
    <Motion v-if="note" as="div" class="wf-note" :data-danger="danger"
      :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, delay: 0.34 }">
      <AlertTriangle :size="13" /><span>{{ note }}</span>
    </Motion>

    <!-- footer: downstream impact + actor -->
    <div class="wf-foot">
      <div v-if="affects.length" class="wf-affects">
        <span class="wf-affects-lab"><Share2 :size="11" /> Powers these modules</span>
        <div class="wf-chips">
          <Motion v-for="(a, i) in affects" :key="a.label" as="span" class="wf-chip"
            :initial="{ opacity: 0, scale: 0.85 }" :animate="{ opacity: 1, scale: 1 }"
            :transition="{ duration: 0.34, delay: 0.3 + i * 0.05, ease: [0.16, 1, 0.3, 1] }">
            <component v-if="a.icon" :is="a.icon" :size="11" /> {{ a.label }}
          </Motion>
        </div>
      </div>

      <Motion v-if="actor" as="div" class="wf-actor"
        :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.42, delay: 0.42, ease: [0.16, 1, 0.3, 1] }">
        <span class="wf-actor-av">{{ initials }}</span>
        <div class="wf-actor-id">
          <span class="wf-actor-eyebrow">{{ actionVerb }} by</span>
          <b>{{ name }}</b>
          <span class="wf-actor-role">{{ role }}</span>
        </div>
        <span class="wf-actor-live"><span class="wf-actor-dot" /> live</span>
      </Motion>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Share2, AlertTriangle, Workflow } from 'lucide-vue-next'
import { actorName, actorInitials, actorRole } from '../composables/useActor'

const props = defineProps({
  accent: { type: String, default: 'var(--set-gold)' },
  icon: { type: [Object, Function], default: Workflow },
  title: { type: String, default: 'How this works' },
  summary: { type: String, default: '' },
  steps: { type: Array, default: () => [] },        // [{ icon?, title, text }]
  affects: { type: Array, default: () => [] },       // [{ icon?, label }]
  note: { type: String, default: '' },
  danger: { type: Boolean, default: false },
  actor: { type: Object, default: null },
  mode: { type: String, default: 'create' },         // create | edit | delete
  orientation: { type: String, default: 'vertical' },// vertical (side) | horizontal (bottom)
})

const isH = computed(() => props.orientation === 'horizontal')
const modeLabel = computed(() => ({ create: 'Creating', edit: 'Editing', delete: 'Removing' }[props.mode] || 'Configuring'))
const actionVerb = computed(() => ({ create: 'Created', edit: 'Edited', delete: 'Removed' }[props.mode] || 'Changed'))
const name = computed(() => actorName(props.actor))
const initials = computed(() => actorInitials(props.actor))
const role = computed(() => actorRole(props.actor))
</script>

<style scoped>
.wf {
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; gap: 13px;
  height: 100%;
}
.wf-grid {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image:
    linear-gradient(color-mix(in srgb, var(--acc) 8%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--acc) 8%, transparent) 1px, transparent 1px);
  background-size: 26px 26px;
  mask-image: radial-gradient(120% 90% at 100% 0%, #000 12%, transparent 72%);
  -webkit-mask-image: radial-gradient(120% 90% at 100% 0%, #000 12%, transparent 72%);
}
.wf-aura {
  position: absolute; inset: -40% -30% auto -10%; height: 70%;
  background: radial-gradient(circle, color-mix(in srgb, var(--acc) 24%, transparent), transparent 70%);
  filter: blur(34px); pointer-events: none;
}
.wf-scan {
  position: absolute; left: 0; right: 0; top: 0; height: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--acc), transparent);
  opacity: 0.7; animation: wf-scan 4.2s ease-in-out infinite;
}
@keyframes wf-scan { 0%, 100% { transform: translateY(0); opacity: 0; } 8% { opacity: 0.7; } 50% { transform: translateY(min(360px, 60vh)); opacity: 0.5; } 92% { opacity: 0; } }

.wf-head { position: relative; display: flex; flex-direction: column; gap: 7px; }
.wf-mode {
  display: inline-flex; align-items: center; gap: 6px; align-self: flex-start;
  font-size: 9px; font-weight: 850; letter-spacing: 0.14em; text-transform: uppercase;
  padding: 4px 10px; border-radius: 999px; color: var(--acc);
  background: color-mix(in srgb, var(--acc) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--acc) 32%, transparent);
}
.wf-mode-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--acc); box-shadow: 0 0 8px var(--acc); animation: set-led-pulse 1.8s ease-in-out infinite; }
.wf-mode[data-mode="delete"] { color: var(--set-conflict); background: var(--set-conflict-soft); border-color: color-mix(in srgb, var(--set-conflict) 32%, transparent); }
.wf-mode[data-mode="delete"] .wf-mode-dot { background: var(--set-conflict); box-shadow: 0 0 8px var(--set-conflict); }
.wf-title { display: inline-flex; align-items: center; gap: 7px; font-size: 13.5px; font-weight: 800; color: var(--set-text); }
.wf-title :deep(svg) { color: var(--acc); }

.wf-summary { position: relative; margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--set-text-secondary); }

/* process spine (vertical) */
.wf-steps { position: relative; display: flex; flex-direction: column; gap: 10px; padding-left: 2px; }
.wf-spine {
  position: absolute; left: 11px; top: 7px; bottom: 7px; width: 2px;
  background: linear-gradient(180deg, var(--acc), color-mix(in srgb, var(--acc) 20%, transparent));
  transform-origin: top; animation: wf-draw 0.7s var(--set-spring) both; animation-delay: 0.1s;
}
@keyframes wf-draw { from { transform: scaleY(0); opacity: 0; } to { transform: scaleY(1); opacity: 1; } }
.wf-step { position: relative; display: flex; align-items: flex-start; gap: 10px; }
.wf-node {
  position: relative; z-index: 1; flex-shrink: 0;
  width: 23px; height: 23px; border-radius: 8px; display: grid; place-items: center;
  font-size: 10.5px; font-weight: 850; color: var(--acc);
  background: var(--set-surface-elevated);
  border: 1px solid color-mix(in srgb, var(--acc) 40%, transparent);
  box-shadow: 0 0 0 4px var(--set-surface), 0 0 14px -4px var(--acc);
}
.wf-node :deep(svg) { color: var(--acc); }
.wf-step-body { display: flex; flex-direction: column; gap: 1px; padding-top: 1px; }
.wf-step-body b { font-size: 11.5px; font-weight: 750; color: var(--set-text); }
.wf-step-body span { font-size: 10.5px; line-height: 1.4; color: var(--set-text-muted); }

/* footer */
.wf-foot { display: contents; }
.wf-affects { display: flex; flex-direction: column; gap: 8px; }
.wf-affects-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.wf-affects-lab :deep(svg) { color: var(--set-text-dim); }
.wf-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.wf-chip {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 650; color: var(--set-text-secondary);
  padding: 4px 10px; border-radius: 999px;
  background: var(--set-surface-elevated); border: 1px solid var(--set-border);
}
.wf-chip :deep(svg) { color: var(--acc); }

/* note */
.wf-note {
  display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border-radius: 11px;
  font-size: 11px; line-height: 1.5; color: var(--set-text-secondary);
  background: color-mix(in srgb, var(--acc) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--acc) 24%, transparent);
}
.wf-note :deep(svg) { color: var(--acc); flex-shrink: 0; margin-top: 1px; }
.wf-note[data-danger="true"] { background: var(--set-conflict-soft); border-color: color-mix(in srgb, var(--set-conflict) 30%, transparent); color: var(--set-text-secondary); }
.wf-note[data-danger="true"] :deep(svg) { color: var(--set-conflict); }

/* actor */
.wf-actor {
  margin-top: auto; display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 12px;
  background: var(--set-surface-elevated); border: 1px solid var(--set-border);
}
.wf-actor-av {
  flex-shrink: 0; width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center;
  font-size: 11.5px; font-weight: 850; color: #1a1206;
  background: var(--set-grad-hero); box-shadow: 0 6px 16px -8px color-mix(in srgb, var(--acc) 70%, transparent);
}
.wf-actor-id { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
.wf-actor-eyebrow { font-size: 8px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.wf-actor-id b { font-size: 12.5px; font-weight: 750; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wf-actor-role { font-size: 10px; color: var(--set-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wf-actor-live { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-ok); }
.wf-actor-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--set-ok); box-shadow: 0 0 8px var(--set-ok); animation: set-led-pulse 1.6s ease-in-out infinite; }

/* ════ HORIZONTAL (bottom-strip) ORIENTATION ════ */
.wf.is-h { height: auto; gap: 12px; }
.wf.is-h .wf-head { flex-direction: row; align-items: center; flex-wrap: wrap; gap: 10px; }
.wf.is-h .wf-steps {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; padding-left: 0;
}
.wf.is-h .wf-step {
  padding: 11px 12px; border-radius: 12px; align-items: flex-start;
  background: var(--set-surface); border: 1px solid var(--set-border);
  border-top: 2px solid color-mix(in srgb, var(--acc) 55%, transparent);
}
.wf.is-h .wf-node { box-shadow: 0 0 12px -4px var(--acc); }
.wf.is-h .wf-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  padding-top: 12px; border-top: 1px solid var(--set-border);
}
.wf.is-h .wf-affects { flex: 1 1 auto; flex-direction: row; align-items: center; gap: 10px; flex-wrap: wrap; }
.wf.is-h .wf-actor { margin-top: 0; flex: 0 0 auto; min-width: 230px; }

@media (max-width: 720px) {
  .wf.is-h .wf-foot { flex-direction: column; align-items: stretch; }
  .wf.is-h .wf-actor { min-width: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .wf-scan, .wf-spine, .wf-mode-dot, .wf-actor-dot { animation: none; }
  .wf-spine { transform: none; opacity: 1; }
}
</style>
