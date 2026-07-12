<template>
  <Presence>
    <Motion v-if="swarm?.active" as="div" class="swb" :initial="{ opacity: 0, y: 8 }"
      :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 8 }" :transition="{ duration: 0.3 }">
      <span class="swb-pulse" aria-hidden="true"><Users :size="13" /></span>
      <span class="swb-t sd-mono">SWARM LIVE · {{ ticketNumber }}</span>
      <span class="swb-people">
        <span v-for="p in swarm.active.participants" :key="String(p.user_id)" class="swb-mono sd-mono"
          :title="p.user_name">{{ initials(p.user_name) }}</span>
        <span class="swb-since sd-mono">since {{ sinceLabel }}</span>
      </span>
      <span class="swb-acts">
        <Motion v-if="!swarm.joined" as="button" class="swb-b join" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }"
          @click="$emit('join')"><UserPlus :size="12" /> Join</Motion>
        <Motion as="button" class="swb-b" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }"
          title="Open the ticket console" @click="$emit('open')"><PanelRight :size="12" /> Console</Motion>
        <Motion as="button" class="swb-b end" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }"
          title="Stand the swarm down (asks for an outcome)" @click="$emit('end')"><Square :size="12" /> End</Motion>
      </span>
    </Motion>
  </Presence>
</template>

<script setup>
/* SdSwarmBar — the live-swarm strip under the console: who's on it, join/end. */
import { computed } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { Users, UserPlus, PanelRight, Square } from 'lucide-vue-next'

const props = defineProps({
  swarm: { type: Object, default: null },      // SwarmStateResponse { active, history, joined }
  ticketNumber: { type: String, default: '' },
  now: { type: Number, default: () => Date.now() },
})
defineEmits(['join', 'end', 'open'])

const initials = (n) => (n || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const sinceLabel = computed(() => {
  const at = props.swarm?.active?.started_at
  if (!at) return ''
  const m = Math.max(0, Math.round((props.now - new Date(at).getTime()) / 60000))
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`
})
</script>

<style scoped>
.swb { display: flex; align-items: center; gap: 11px; flex-wrap: wrap; padding: 10px 14px; border-radius: 13px;
  border: 1px solid color-mix(in srgb, var(--sd-l2-core) 45%, var(--sd-border));
  background: linear-gradient(120deg, color-mix(in srgb, var(--sd-l2-core) 10%, var(--sd-surface)), var(--sd-surface));
  color: var(--sd-text); }
.swb-pulse { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%;
  color: var(--sd-l2-core); border: 1px solid color-mix(in srgb, var(--sd-l2-core) 55%, transparent);
  animation: swb-ring 2.2s ease-out infinite; }
@keyframes swb-ring { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-l2-core) 35%, transparent); }
  100% { box-shadow: 0 0 0 10px transparent; } }
.swb-t { font-size: 10px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-l2-core); }
.swb-people { display: inline-flex; align-items: center; gap: 5px; }
.swb-mono { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%;
  font-size: 8.5px; font-weight: 800; color: var(--sd-l2-core);
  border: 1px solid color-mix(in srgb, var(--sd-l2-core) 50%, transparent);
  background: color-mix(in srgb, var(--sd-l2-core) 10%, transparent); }
.swb-since { margin-left: 4px; font-size: 9px; letter-spacing: 0.1em; color: var(--sd-text-dim); }
.swb-acts { display: inline-flex; gap: 7px; margin-left: auto; }
.swb-b { display: inline-flex; align-items: center; gap: 6px; padding: 7px 11px; border-radius: 10px;
  font-family: inherit; font-size: 11px; font-weight: 700; cursor: pointer;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-secondary); }
.swb-b.join { color: var(--sd-l2-go); border-color: color-mix(in srgb, var(--sd-l2-go) 40%, transparent); }
.swb-b.end { color: var(--sd-l2-halt); border-color: color-mix(in srgb, var(--sd-l2-halt) 35%, transparent); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .swb-pulse { animation: none; }
}
</style>
